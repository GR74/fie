from __future__ import annotations

from typing import Any

from .mock_model import HfaInputs, predict_hfa, predict_loudness_db, simulate_concessions
from .schemas import Game, OptimizeCandidate, OptimizeRequest
from .storage import load_venue


def _score_candidate(*, delta_win: float, util: float, revenue_total: float, target_pp: float | None) -> float:
    """
    Higher is better. Reward delta win prob. Penalize ops overload. Mildly reward revenue.
    If target_pp is provided, reward being at/above target.
    """
    delta_pp = delta_win * 100.0
    overload = max(0.0, util - 0.90)  # start penalizing above 90% util
    score = 1.0 * delta_pp
    score -= 6.0 * overload  # strong ops penalty
    score += 0.000001 * revenue_total  # tiny tie-breaker
    if target_pp is not None:
        score += 2.0 * min(delta_pp, target_pp)  # reward progress
        if delta_pp >= target_pp:
            score += 3.0  # bonus for hitting target
    return float(score)


def optimize_game(game: Game, req: OptimizeRequest) -> tuple[OptimizeCandidate, list[OptimizeCandidate]]:
    """
    Simple grid/heuristic optimizer (fast, deterministic).
    Returns best candidate + next best alternatives.
    """
    venue = load_venue()
    defaults = venue.get("concessions", {})
    crowd_defaults = venue.get("crowd", {})

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
        "crowd_energy": int(crowd_defaults.get("default_crowd_energy", 78)),
        "stands_open_pct": int(defaults.get("default_stands_open_pct", 85)),
        "staff_per_stand": int(defaults.get("default_staff_per_stand", 6)),
        "express_lanes": False,
        "early_arrival_promo": False,
    }
    current = {**base, **req.current_overrides.model_dump(exclude_none=True)}

    base_hfa = predict_hfa(
        HfaInputs(
            attendance=int(base["attendance"]),
            venue_capacity=game.venue_capacity,
            student_ratio=float(base["student_ratio"]),
            rivalry_flag=bool(game.rivalry_flag),
            opponent_rank=int(base["opponent_rank"]),
            home_team_rank=int(base["home_team_rank"]),
            weather_wind_mph=int(base["weather_wind_mph"]),
            kickoff_time_local=str(base["kickoff_time_local"]),
            promotion_type=base["promotion_type"],
            crowd_energy=int(base["crowd_energy"]),
        )
    )
    base_p = float(base_hfa["predicted_win_probability"])

    # Search space (tight on purpose for speed)
    att0 = int(current["attendance"])
    sr0 = float(current["student_ratio"])
    en0 = int(current["crowd_energy"])

    att_vals = list(range(att0, att0 + int(req.max_attendance_increase) + 1, 500))
    sr_step = 0.005
    sr_max = min(1.0, sr0 + float(req.max_student_ratio_increase))
    sr_vals: list[float] = []
    x = sr0
    while x <= sr_max + 1e-9:
        sr_vals.append(round(x, 3))
        x += sr_step
    en_max = min(100, en0 + int(req.max_crowd_energy_increase))
    en_vals = list(range(en0, en_max + 1, 5))

    stands_vals = list(range(max(req.min_stands_open_pct, 50), 101, 5))
    staff_vals = list(range(min(int(current["staff_per_stand"]), req.max_staff_per_stand), req.max_staff_per_stand + 1))
    express_vals = [False, True]

    candidates: list[OptimizeCandidate] = []

    for att in att_vals:
        for sr in sr_vals:
            for en in en_vals:
                # Constrain student count realistically (soft): if sr too high at low attendance, skip
                if att > 0 and (sr > 0.30):
                    continue

                for stands_open_pct in stands_vals:
                    for staff_per_stand in staff_vals:
                        for express in express_vals:
                            hfa = predict_hfa(
                                HfaInputs(
                                    attendance=int(att),
                                    venue_capacity=game.venue_capacity,
                                    student_ratio=float(sr),
                                    rivalry_flag=bool(game.rivalry_flag),
                                    opponent_rank=int(current["opponent_rank"]),
                                    home_team_rank=int(current["home_team_rank"]),
                                    weather_wind_mph=int(current["weather_wind_mph"]),
                                    kickoff_time_local=str(current["kickoff_time_local"]),
                                    promotion_type=current["promotion_type"],
                                    crowd_energy=int(en),
                                )
                            )
                            p = float(hfa["predicted_win_probability"])

                            concessions = simulate_concessions(
                                attendance=int(att),
                                student_ratio=float(sr),
                                kickoff_time_local=str(current["kickoff_time_local"]),
                                weather_temp_f=int(current["weather_temp_f"]),
                                promotion_type=current["promotion_type"],
                                stands_open_pct=int(stands_open_pct),
                                staff_per_stand=int(staff_per_stand),
                                express_lanes=bool(express),
                                early_arrival_promo=bool(current["early_arrival_promo"]),
                            )

                            util = float(concessions["ops"]["worst_utilization"])
                            delta_win = p - base_p
                            score = _score_candidate(
                                delta_win=delta_win,
                                util=util,
                                revenue_total=float(concessions["revenue_total_usd"]),
                                target_pp=req.target_delta_win_pp,
                            )

                            candidates.append(
                                OptimizeCandidate(
                                    overrides={
                                        "attendance": int(att),
                                        "student_ratio": float(sr),
                                        "crowd_energy": int(en),
                                        "stands_open_pct": int(stands_open_pct),
                                        "staff_per_stand": int(staff_per_stand),
                                        "express_lanes": bool(express),
                                    },
                                    delta_win_probability=float(delta_win),
                                    ops_worst_utilization=util,
                                    revenue_total_usd=float(concessions["revenue_total_usd"]),
                                    score=float(score),
                                )
                            )

    candidates.sort(key=lambda c: c.score, reverse=True)
    best = candidates[0]
    alts = candidates[1:6]
    return best, alts


