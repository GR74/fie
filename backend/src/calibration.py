from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any

from .mock_model import HfaInputs, predict_hfa
from .schemas import Game
from .storage import load_venue


@dataclass(frozen=True)
class CalibrationPoint:
    p: float
    y: int


def _make_point(rng: random.Random) -> CalibrationPoint:
    venue = load_venue()
    cap = int(venue.get("capacity", 102780))

    # Random but plausible ranges around OSU home games
    attendance = int(rng.randrange(int(cap * 0.86), int(cap * 1.02), 250))
    student_ratio = rng.uniform(0.14, 0.26)
    rivalry_flag = rng.random() < 0.18
    opponent_rank = rng.choice([rng.randint(1, 15), 25, 25, 25])
    home_rank = rng.choice([rng.randint(1, 6), rng.randint(1, 10)])
    wind = rng.randint(2, 22)
    kickoff = rng.choice(["12:00", "15:30", "19:30"])
    promotion = rng.choice(["none", "student_push", "alumni_night", "family_bundle", "rivalry_hype"])
    energy = rng.randint(40, 100)

    res = predict_hfa(
        HfaInputs(
            attendance=attendance,
            venue_capacity=cap,
            student_ratio=student_ratio,
            rivalry_flag=rivalry_flag,
            opponent_rank=opponent_rank,
            home_team_rank=home_rank,
            weather_wind_mph=wind,
            kickoff_time_local=kickoff,
            promotion_type=promotion,  # type: ignore[arg-type]
            crowd_energy=energy,
        )
    )
    p = float(res["predicted_win_probability"])
    y = 1 if rng.random() < p else 0
    return CalibrationPoint(p=p, y=y)


def generate_mock_calibration_points(n: int = 240, seed: int = 42) -> list[CalibrationPoint]:
    rng = random.Random(seed)
    return [_make_point(rng) for _ in range(n)]


def reliability_buckets(points: list[CalibrationPoint], bins: int = 10) -> dict[str, Any]:
    """
    Bin predictions into equal-width probability bins and return reliability curve data.
    """
    bins = max(5, min(int(bins), 20))
    buckets = []
    for i in range(bins):
        lo = i / bins
        hi = (i + 1) / bins
        bucket_pts = [
            pt
            for pt in points
            if (pt.p >= lo and (pt.p < hi if i < bins - 1 else pt.p <= hi))
        ]
        if not bucket_pts:
            buckets.append(
                {"bin_lo": lo, "bin_hi": hi, "count": 0, "avg_pred": (lo + hi) / 2, "avg_obs": None}
            )
            continue
        avg_pred = sum(pt.p for pt in bucket_pts) / len(bucket_pts)
        avg_obs = sum(pt.y for pt in bucket_pts) / len(bucket_pts)
        buckets.append(
            {
                "bin_lo": lo,
                "bin_hi": hi,
                "count": len(bucket_pts),
                "avg_pred": float(avg_pred),
                "avg_obs": float(avg_obs),
            }
        )

    # Brier score
    brier = sum((pt.p - pt.y) ** 2 for pt in points) / max(1, len(points))
    return {"brier": float(brier), "buckets": buckets, "n": len(points), "bins": bins}


def build_hfa_calibration(games: list[Game]) -> dict[str, Any]:
    """
    Product-friendly calibration payload for the HFA engine.
    Today: synthetic scenarios (deterministic) so we can ship a real calibration UX in MVP.
    Later: replace points with real historical predictions/outcomes.
    """
    _ = games  # reserved for real-data joins later
    pts = generate_mock_calibration_points(n=240, seed=42)
    data = reliability_buckets(pts, bins=10)
    return {"model": "hfa_mock_v1", **data}

