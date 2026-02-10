from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.mock_model import HfaInputs, engine_assumptions_snapshot, predict_hfa, predict_loudness_db, simulate_concessions
from src.calibration import build_hfa_calibration
from src.espn_api import get_espn_schedule, get_espn_rankings, get_espn_team_info, enrich_game_with_espn
from src.weather_api import get_game_weather
from src.schemas import (
    CalibrationResponse,
    GameDetailResponse,
    GamesListResponse,
    GameSimulateResponse,
    HealthResponse,
    HfaResponse,
    RecommendationsRequest,
    ScenarioRequest,
    SimulateRequest,
    WhatIfRequest,
    OptimizeRequest,
    OptimizeResponse,
    ScenarioCreateRequest,
    SavedScenarioResponse,
    ScenariosListResponse,
    SensitivityResponse,
)
from src.optimizer import optimize_game
from src.scenario_store import create_scenario, delete_scenario, get_scenario, list_scenarios, to_dict
from src.sensitivity import hfa_sensitivity_surface
from src.storage import get_game, get_venue, load_games
from src.monte_carlo import run_monte_carlo

app = FastAPI(title="Fan Impact Engine (MVP)", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/games", response_model=GamesListResponse)
def list_games() -> GamesListResponse:
    return GamesListResponse(games=load_games())


@app.get("/games/{game_id}", response_model=GameDetailResponse)
def game_detail(game_id: str) -> GameDetailResponse:
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return GameDetailResponse(game=game)


@app.post("/games/{game_id}/simulate", response_model=GameSimulateResponse)
def simulate_game(game_id: str, req: SimulateRequest) -> GameSimulateResponse:
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    overrides = req.overrides.model_dump(exclude_none=True)
    effective_venue_id = overrides.pop("venue_id", None) or game.venue_id
    venue = get_venue(effective_venue_id)
    defaults = venue.get("concessions", {})
    crowd_defaults = venue.get("crowd", {})
    effective_cap = int(venue.get("capacity", game.venue_capacity))

    # Baseline scenario for this game
    base = {
        "attendance": game.baseline_attendance,
        "student_ratio": game.baseline_student_ratio,
        "opponent_rank": game.opponent_rank or 25,
        "home_team_rank": game.home_team_rank or 25,
        "kickoff_time_local": game.kickoff_time_local,
        "weather_wind_mph": game.baseline_weather_wind_mph,
        "weather_temp_f": game.baseline_weather_temp_f,
        "weather_precip_chance": game.baseline_weather_precip_chance,
        "promotion_type": game.baseline_promotion_type,
        "crowd_energy": int(crowd_defaults.get("default_crowd_energy", 70)),
        "stands_open_pct": int(defaults.get("default_stands_open_pct", 85)),
        "staff_per_stand": int(defaults.get("default_staff_per_stand", 6)),
        "seats_open_pct": 100,
        "express_lanes": False,
        "early_arrival_promo": False,
        "venue_capacity": effective_cap,
    }
    cf = {**base, **overrides}

    def run_one(s: dict) -> dict:
        # McMahon & Quintanar: more empty seats (lower fill) hurts home team. Effective capacity = cap * seats_open_pct/100.
        seats_open = int(s.get("seats_open_pct", 100))
        cap = int(s.get("venue_capacity", game.venue_capacity))
        effective_cap = max(1, int(cap * seats_open / 100))
        is_indoor = bool(venue.get("is_indoor", False))
        hfa = predict_hfa(
            HfaInputs(
                attendance=int(s["attendance"]),
                venue_capacity=effective_cap,
                student_ratio=float(s["student_ratio"]),
                rivalry_flag=bool(game.rivalry_flag),
                opponent_rank=int(s["opponent_rank"]),
                home_team_rank=int(s["home_team_rank"]),
                weather_wind_mph=int(s["weather_wind_mph"]),
                kickoff_time_local=str(s["kickoff_time_local"]),
                promotion_type=s["promotion_type"],
                crowd_energy=int(s["crowd_energy"]),
                is_indoor=is_indoor,
            )
        )
        noise = predict_loudness_db(
            attendance=int(s["attendance"]),
            venue_capacity=cap,
            rivalry_flag=bool(game.rivalry_flag),
            kickoff_time_local=str(s["kickoff_time_local"]),
            crowd_energy=int(s["crowd_energy"]),
            student_ratio=float(s["student_ratio"]),
            is_indoor=is_indoor,
            weather_temp_f=int(s["weather_temp_f"]),
        )
        concessions = simulate_concessions(
            attendance=int(s["attendance"]),
            student_ratio=float(s["student_ratio"]),
            kickoff_time_local=str(s["kickoff_time_local"]),
            weather_temp_f=int(s["weather_temp_f"]),
            promotion_type=s["promotion_type"],
            stands_open_pct=int(s["stands_open_pct"]),
            staff_per_stand=int(s["staff_per_stand"]),
            express_lanes=bool(s["express_lanes"]),
            early_arrival_promo=bool(s["early_arrival_promo"]),
            venue=venue,
            is_indoor=is_indoor,
        )
        return {"hfa": hfa, "noise": noise, "concessions": concessions}

    baseline = run_one(base)
    counterfactual = run_one(cf)

    return GameSimulateResponse(
        game_id=game.game_id,
        baseline=baseline,  # type: ignore[arg-type]
        counterfactual=counterfactual,  # type: ignore[arg-type]
        delta_win_probability=float(
            counterfactual["hfa"]["predicted_win_probability"] - baseline["hfa"]["predicted_win_probability"]
        ),
        engine_assumptions=engine_assumptions_snapshot(),
    )


@app.post("/predict/hfa", response_model=HfaResponse)
def predict_hfa_global(scenario: ScenarioRequest) -> HfaResponse:
    venue = get_venue(None)
    cap = int(venue.get("capacity", 102780))
    res = predict_hfa(
        HfaInputs(
            attendance=int(scenario.attendance),
            venue_capacity=cap,
            student_ratio=float(scenario.student_ratio),
            rivalry_flag=bool(scenario.rival_game),
            opponent_rank=int(scenario.opponent_rank),
            home_team_rank=int(scenario.home_rank),
            weather_wind_mph=int(scenario.weather_wind),
            kickoff_time_local=str(scenario.kickoff_time_local),
            promotion_type=scenario.promotion,
            crowd_energy=int(scenario.crowd_energy),
            is_indoor=bool(getattr(scenario, "is_indoor", False)),
        )
    )
    return HfaResponse(**res)


@app.post("/simulate/what-if")
def simulate_what_if(req: WhatIfRequest) -> dict:
    base = req.base_scenario
    baseline = predict_hfa_global(base)

    data = base.model_dump()
    data.update(req.changes or {})
    modified = ScenarioRequest(**data)
    counter = predict_hfa_global(modified)

    return {
        "baseline_win_prob": float(baseline.predicted_win_probability),
        "counterfactual_win_prob": float(counter.predicted_win_probability),
        "delta_win_prob": float(counter.predicted_win_probability - baseline.predicted_win_probability),
        "changes_applied": req.changes,
    }


@app.post("/recommendations")
def recommendations(req: RecommendationsRequest) -> dict:
    """
    Mock lever ranking: try a small set of feasible moves and return best deltas.
    """
    base = req.scenario
    baseline = predict_hfa_global(base).predicted_win_probability

    candidates: list[dict] = []
    # Attendance bump
    if req.max_attendance_increase > 0:
        bumped = ScenarioRequest(**{**base.model_dump(), "attendance": base.attendance + req.max_attendance_increase})
        p = predict_hfa_global(bumped).predicted_win_probability
        candidates.append({"lever": "attendance", "change": f"+{req.max_attendance_increase}", "delta_pp": (p - baseline) * 100})

    # Student ratio bump
    if req.max_student_ratio_increase > 0:
        sr = min(1.0, base.student_ratio + req.max_student_ratio_increase)
        bumped = ScenarioRequest(**{**base.model_dump(), "student_ratio": sr})
        p = predict_hfa_global(bumped).predicted_win_probability
        candidates.append({"lever": "student_ratio", "change": f"+{req.max_student_ratio_increase:.3f}", "delta_pp": (p - baseline) * 100})

    # Energy bump
    if base.crowd_energy < 100:
        bumped = ScenarioRequest(**{**base.model_dump(), "crowd_energy": min(100, base.crowd_energy + 15)})
        p = predict_hfa_global(bumped).predicted_win_probability
        candidates.append({"lever": "crowd_energy", "change": "+15", "delta_pp": (p - baseline) * 100})

    candidates.sort(key=lambda x: x["delta_pp"], reverse=True)
    return {"baseline_win_prob": float(baseline), "recommendations": candidates[:3]}


@app.get("/calibration/hfa")
def calibration_hfa() -> CalibrationResponse:
    """
    Calibration/backtesting report for HFA (mock).
    """
    return CalibrationResponse(**build_hfa_calibration(load_games()))


@app.post("/games/{game_id}/optimize", response_model=OptimizeResponse)
def optimize(game_id: str, req: OptimizeRequest) -> OptimizeResponse:
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    best, alts = optimize_game(game, req)
    return OptimizeResponse(game_id=game_id, recommended=best, alternatives=alts)


@app.get("/scenarios", response_model=ScenariosListResponse)
def scenarios_list() -> ScenariosListResponse:
    return ScenariosListResponse(
        scenarios=[SavedScenarioResponse(**to_dict(s)) for s in list_scenarios()]
    )


@app.post("/scenarios", response_model=SavedScenarioResponse)
def scenarios_create(req: ScenarioCreateRequest) -> SavedScenarioResponse:
    sc = create_scenario(game_id=req.game_id, overrides=req.overrides, note=req.note)
    return SavedScenarioResponse(**to_dict(sc))


@app.get("/scenarios/{scenario_id}", response_model=SavedScenarioResponse)
def scenarios_get(scenario_id: str) -> SavedScenarioResponse:
    sc = get_scenario(scenario_id)
    if not sc:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return SavedScenarioResponse(**to_dict(sc))


@app.delete("/scenarios/{scenario_id}")
def scenarios_delete(scenario_id: str) -> dict:
    ok = delete_scenario(scenario_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"deleted": True}


@app.get("/games/{game_id}/sensitivity", response_model=SensitivityResponse)
def sensitivity(game_id: str) -> SensitivityResponse:
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    data = hfa_sensitivity_surface(
        game,
        attendance_min=int(game.venue_capacity * 0.85),
        attendance_max=int(game.venue_capacity),
        attendance_step=2500,
        student_ratio_min=0.14,
        student_ratio_max=0.26,
        student_ratio_step=0.01,
        crowd_energy=78,
    )
    return SensitivityResponse(game_id=game_id, **data)


@app.post("/games/{game_id}/monte-carlo")
def monte_carlo(game_id: str, req: SimulateRequest) -> dict:
    """Run Monte Carlo simulation to quantify uncertainty."""
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    ov = req.overrides.model_dump(exclude_none=True)
    effective_venue_id = ov.pop("venue_id", None) or game.venue_id
    venue = get_venue(effective_venue_id)
    defaults = venue.get("concessions", {})
    crowd_defaults = venue.get("crowd", {})
    effective_cap = int(venue.get("capacity", game.venue_capacity))

    overrides = {
        "attendance": ov.get("attendance", game.baseline_attendance),
        "student_ratio": ov.get("student_ratio", game.baseline_student_ratio),
        "crowd_energy": ov.get("crowd_energy", int(crowd_defaults.get("default_crowd_energy", 70))),
        "stands_open_pct": ov.get("stands_open_pct", int(defaults.get("default_stands_open_pct", 85))),
        "staff_per_stand": ov.get("staff_per_stand", int(defaults.get("default_staff_per_stand", 6))),
        "express_lanes": ov.get("express_lanes", False),
        "early_arrival_promo": ov.get("early_arrival_promo", False),
        "kickoff_time_local": ov.get("kickoff_time_local", game.kickoff_time_local),
        "weather_wind_mph": ov.get("weather_wind_mph", game.baseline_weather_wind_mph),
        "weather_temp_f": ov.get("weather_temp_f", game.baseline_weather_temp_f),
        "promotion_type": ov.get("promotion_type", game.baseline_promotion_type),
        "seats_open_pct": ov.get("seats_open_pct", 100),
        "venue_capacity": effective_cap,
    }

    result = run_monte_carlo(
        game=game,
        venue=venue,
        base_overrides=overrides,
        n_simulations=200,  # Reduced for faster response
        variation_pct=0.08,
    )

    return {"game_id": game_id, **result}


# ============================================================================
# LIVE DATA ENDPOINTS — ESPN + Weather
# ============================================================================

@app.get("/live/schedule/{sport}")
def live_schedule(sport: str = "football", season: int | None = None) -> dict:
    """Fetch live schedule from ESPN for a given sport."""
    games = get_espn_schedule(sport, season)
    return {
        "sport": sport,
        "count": len(games),
        "games": games,
        "_source": "ESPN public API (site.api.espn.com)" if games else "unavailable",
    }


@app.get("/live/rankings/{sport}")
def live_rankings(sport: str = "football") -> dict:
    """Fetch current AP/Coaches poll rankings from ESPN."""
    rankings = get_espn_rankings(sport)
    return {
        "sport": sport,
        "count": len(rankings),
        "rankings": rankings,
        "_source": "ESPN public API" if rankings else "unavailable",
    }


@app.get("/live/team/{sport}")
def live_team(sport: str = "football") -> dict:
    """Fetch Ohio State team info from ESPN."""
    info = get_espn_team_info(sport)
    if not info:
        return {"error": "Could not fetch team info", "_source": "unavailable"}
    return info


@app.get("/live/weather/{game_id}")
def live_weather(game_id: str) -> dict:
    """Fetch weather forecast/normals for a specific game."""
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    venue = get_venue(game.venue_id)
    is_indoor = bool(venue.get("is_indoor", False))

    weather = get_game_weather(
        game_date=str(game.date),
        kickoff_time=game.kickoff_time_local,
        is_indoor=is_indoor,
    )
    return {
        "game_id": game_id,
        "date": str(game.date),
        "kickoff_time": game.kickoff_time_local,
        "venue": game.venue_name,
        "is_indoor": is_indoor,
        "weather": weather,
    }


@app.get("/games/{game_id}/enriched")
def game_enriched(game_id: str) -> dict:
    """
    Return game detail enriched with live ESPN data (attendance, scores, rankings)
    and weather forecast. Falls back gracefully if APIs are unavailable.
    """
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    game_dict = game.model_dump()
    game_dict["date"] = str(game.date)

    # Enrich with ESPN live data
    espn_data = enrich_game_with_espn(game_dict, game.sport)
    game_dict["live"] = espn_data if espn_data else {"_espn_matched": False, "_source": "no ESPN match"}

    # Enrich with weather
    venue = get_venue(game.venue_id)
    is_indoor = bool(venue.get("is_indoor", False))
    weather = get_game_weather(str(game.date), game.kickoff_time_local, is_indoor)
    game_dict["weather"] = weather

    # Data sources summary
    sources = []
    sources.append({"field": "schedule", "source": "static (games.json)", "status": "REAL/ESTIMATED"})
    if espn_data.get("_espn_matched"):
        sources.append({"field": "attendance/rankings", "source": "ESPN public API", "status": "LIVE"})
    if weather.get("source") == "LIVE":
        sources.append({"field": "weather", "source": "Open-Meteo forecast API", "status": "LIVE"})
    elif weather.get("source") == "HISTORICAL":
        sources.append({"field": "weather", "source": "NOAA/NWS 1991-2020 normals", "status": "HISTORICAL"})
    game_dict["data_sources"] = sources

    return game_dict

