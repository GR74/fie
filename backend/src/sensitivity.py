from __future__ import annotations

from typing import Any

from .mock_model import HfaInputs, predict_hfa
from .schemas import Game


def hfa_sensitivity_surface(
    game: Game,
    *,
    attendance_min: int,
    attendance_max: int,
    attendance_step: int,
    student_ratio_min: float,
    student_ratio_max: float,
    student_ratio_step: float,
    crowd_energy: int | None = None,
) -> dict[str, Any]:
    """
    Generate a grid of win probabilities for attendance × student_ratio.
    Uses game baseline for other context.
    """
    att_vals = list(range(int(attendance_min), int(attendance_max) + 1, int(attendance_step)))
    sr_vals: list[float] = []
    x = float(student_ratio_min)
    while x <= float(student_ratio_max) + 1e-9:
        sr_vals.append(round(x, 3))
        x += float(student_ratio_step)

    en = int(crowd_energy) if crowd_energy is not None else 78

    grid: list[list[float]] = []
    for sr in sr_vals:
        row: list[float] = []
        for att in att_vals:
            res = predict_hfa(
                HfaInputs(
                    attendance=int(att),
                    venue_capacity=int(game.venue_capacity),
                    student_ratio=float(sr),
                    rivalry_flag=bool(game.rivalry_flag),
                    opponent_rank=int(game.opponent_rank or 25),
                    home_team_rank=int(game.home_team_rank or 25),
                    weather_wind_mph=int(game.baseline_weather_wind_mph),
                    kickoff_time_local=str(game.kickoff_time_local),
                    promotion_type=game.baseline_promotion_type,
                    crowd_energy=en,
                )
            )
            row.append(float(res["predicted_win_probability"]))
        grid.append(row)

    return {
        "attendance": att_vals,
        "student_ratio": sr_vals,
        "win_probability": grid,
        "meta": {
            "crowd_energy": en,
            "note": "Surface uses baseline context for all other factors (mock engine).",
        },
    }


