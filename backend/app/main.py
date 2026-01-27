from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.mock_model import HfaInputs, engine_assumptions_snapshot, predict_hfa, predict_loudness_db, simulate_concessions
from src.calibration import build_hfa_calibration
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
from src.storage import get_game, load_games, load_venue
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

    venue = load_venue()
    defaults = venue.get("concessions", {})
    crowd_defaults = venue.get("crowd", {})

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
        "express_lanes": False,
        "early_arrival_promo": False,
    }

    overrides = req.overrides.model_dump(exclude_none=True)
    cf = {**base, **overrides}

    def run_one(s: dict) -> dict:
        hfa = predict_hfa(
            HfaInputs(
                attendance=int(s["attendance"]),
                venue_capacity=game.venue_capacity,
                student_ratio=float(s["student_ratio"]),
                rivalry_flag=bool(game.rivalry_flag),
                opponent_rank=int(s["opponent_rank"]),
                home_team_rank=int(s["home_team_rank"]),
                weather_wind_mph=int(s["weather_wind_mph"]),
                kickoff_time_local=str(s["kickoff_time_local"]),
                promotion_type=s["promotion_type"],
                crowd_energy=int(s["crowd_energy"]),
            )
        )
        noise = predict_loudness_db(
            attendance=int(s["attendance"]),
            venue_capacity=game.venue_capacity,
            rivalry_flag=bool(game.rivalry_flag),
            kickoff_time_local=str(s["kickoff_time_local"]),
            crowd_energy=int(s["crowd_energy"]),
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
    venue = load_venue()
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
    
    overrides = {
        "attendance": req.attendance if req.attendance is not None else game.baseline_attendance,
        "student_ratio": req.student_ratio if req.student_ratio is not None else game.baseline_student_ratio,
        "crowd_energy": req.crowd_energy if req.crowd_energy is not None else 78,
        "stands_open_pct": req.stands_open_pct if req.stands_open_pct is not None else 85,
        "staff_per_stand": req.staff_per_stand if req.staff_per_stand is not None else 6,
        "express_lanes": req.express_lanes if req.express_lanes is not None else False,
    }
    
    result = run_monte_carlo(
        game_id=game_id,
        base_overrides=overrides,
        n_simulations=200,  # Reduced for faster response
        variation_pct=0.08,
    )
    
    return {"game_id": game_id, **result}


