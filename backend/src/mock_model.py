from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal

from .storage import load_concessions_menu, load_venue

PromotionType = Literal["none", "student_push", "alumni_night", "family_bundle", "rivalry_hype"]


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _normal_ci_from_logit(*, logit: float, sd_logit: float, z: float = 1.645) -> tuple[float, float]:
    """
    Approximate CI by treating logit as Normal(logit, sd_logit) and mapping through sigmoid.
    Default z=1.645 (~90% CI) for a product-friendly band.
    """
    lo = _sigmoid(logit - z * sd_logit)
    hi = _sigmoid(logit + z * sd_logit)
    return (float(lo), float(hi))


def _is_night(kickoff_time_local: str) -> bool:
    try:
        hh = int(kickoff_time_local.split(":")[0])
        return hh >= 18
    except Exception:
        return False


@dataclass(frozen=True)
class HfaInputs:
    attendance: int
    venue_capacity: int
    student_ratio: float
    rivalry_flag: bool
    opponent_rank: int
    home_team_rank: int
    weather_wind_mph: int
    kickoff_time_local: str
    promotion_type: PromotionType
    crowd_energy: int  # 0-100


def predict_hfa(inputs: HfaInputs) -> dict[str, Any]:
    """
    Deterministic, interpretable "logistic-ish" win-probability model.
    Returns probability + a contribution breakdown in percentage points.
    """
    attendance = max(inputs.attendance, 0)
    cap = max(inputs.venue_capacity, 1)
    fill = min(attendance / cap, 1.2)
    fill_clamped = max(0.0, min(fill, 1.0))

    # Normalize ranks: lower is better (1 is best). Treat missing by caller.
    rank_edge = (inputs.opponent_rank - inputs.home_team_rank) / 25.0  # positive favors home

    night = 1.0 if _is_night(inputs.kickoff_time_local) else 0.0
    rivalry = 1.0 if inputs.rivalry_flag else 0.0

    # Energy saturates; last 20 points matter less.
    energy = max(0, min(inputs.crowd_energy, 100)) / 100.0
    energy_effect = (energy**0.7)  # 0..1

    promo_map: dict[PromotionType, float] = {
        "none": 0.0,
        "student_push": 0.15,
        "alumni_night": 0.10,
        "family_bundle": -0.05,
        "rivalry_hype": 0.18,
    }

    # Coefficients chosen to produce believable deltas (few %-pts).
    intercept = 0.25
    terms: dict[str, float] = {
        "attendance_fill": 1.10 * (fill_clamped - 0.85),
        "student_ratio": 0.90 * (inputs.student_ratio - 0.18),
        "rivalry": 0.25 * rivalry,
        "rank_edge": 0.85 * rank_edge,
        "wind_penalty": -0.15 * max(0.0, (inputs.weather_wind_mph - 10) / 10.0),
        "night_kick": 0.08 * night,
        "promotion": promo_map[inputs.promotion_type],
        "crowd_energy": 0.35 * energy_effect,
    }

    logit_full = intercept + sum(terms.values())
    p_full = _sigmoid(logit_full)

    # --- Uncertainty (mock, deterministic) ---
    # We model uncertainty on the logit scale and map to probability bounds.
    # Intuition: bigger rank gaps, extreme weather, and lower fill increase volatility.
    sd_parts = {
        "base_model_noise": 0.18,
        "rank_uncertainty": 0.06 * abs(rank_edge),
        "weather_uncertainty": 0.04 * _clamp(inputs.weather_wind_mph / 25.0, 0.0, 1.0),
        "crowd_uncertainty": 0.04 * (1.0 - _clamp(fill_clamped, 0.0, 1.0)),
        "rivalry_variance": 0.03 * rivalry,
    }
    sd_logit = float(sum(sd_parts.values()))
    ci_low, ci_high = _normal_ci_from_logit(logit=logit_full, sd_logit=sd_logit)

    # Contribution breakdown in probability points via leave-one-out on the logit.
    contrib_pp: dict[str, float] = {}
    for k, v in terms.items():
        p_without = _sigmoid(logit_full - v)
        contrib_pp[k] = (p_full - p_without) * 100.0

    return {
        "predicted_win_probability": float(p_full),
        "predicted_win_probability_ci_low": float(ci_low),
        "predicted_win_probability_ci_high": float(ci_high),
        "uncertainty": {
            "ci_level": 0.90,
            "sd_logit": sd_logit,
            "components": {k: float(v) for k, v in sd_parts.items()},
        },
        "feature_contributions_pp": {k: float(v) for k, v in contrib_pp.items()},
        "terms_logit": {k: float(v) for k, v in terms.items()},
        "intercept_logit": float(intercept),
    }


def predict_loudness_db(
    *,
    attendance: int,
    venue_capacity: int,
    rivalry_flag: bool,
    kickoff_time_local: str,
    crowd_energy: int,
) -> dict[str, Any]:
    cap = max(venue_capacity, 1)
    fill = max(0.0, min(attendance / cap, 1.0))
    night = _is_night(kickoff_time_local)
    energy = max(0, min(crowd_energy, 100)) / 100.0

    # Decibels are logarithmic; we keep this simple but bounded.
    base = 92.0
    base += 10.0 * fill  # 0..10
    base += 2.0 if rivalry_flag else 0.0
    base += 1.0 if night else 0.0
    base += (energy**0.6) * 8.0  # 0..8

    db = max(85.0, min(base, 118.0))

    # Uncertainty: crowd energy and fill extremes increase variance.
    sd_db = 1.2 + (1.1 * (1.0 - fill)) + (0.8 * (1.0 - energy))
    ci_low = float(max(70.0, db - 1.645 * sd_db))
    ci_high = float(min(130.0, db + 1.645 * sd_db))
    return {
        "projected_decibels": float(db),
        "projected_decibels_ci_low": ci_low,
        "projected_decibels_ci_high": ci_high,
        "uncertainty": {
            "ci_level": 0.90,
            "sd_db": float(sd_db),
            "drivers": {
                "fill_factor": float(fill),
                "energy_factor": float(energy),
                "night_game": bool(night),
                "rivalry_flag": bool(rivalry_flag),
            },
        },
        "energy_score": int(round(energy * 100)),
    }


def simulate_concessions(
    *,
    attendance: int,
    student_ratio: float,
    kickoff_time_local: str,
    weather_temp_f: int,
    promotion_type: PromotionType,
    stands_open_pct: int,
    staff_per_stand: int,
    express_lanes: bool,
    early_arrival_promo: bool,
) -> dict[str, Any]:
    venue = load_venue()
    menu = load_concessions_menu()

    attendance = max(0, int(attendance))
    student_ratio = max(0.0, min(float(student_ratio), 1.0))

    student_count = int(round(attendance * student_ratio))
    nonstudent_count = max(0, attendance - student_count)

    per_student = float(menu["segments"]["student"]["per_cap_spend_usd"])
    per_non = float(menu["segments"]["nonstudent"]["per_cap_spend_usd"])

    adj = menu["adjustments"]
    mult = 1.0
    if weather_temp_f <= 45:
        mult *= 1.0 + (float(adj["cold_weather_spend_boost_pct"]) / 100.0)
    if _is_night(kickoff_time_local):
        mult *= 1.0 + (float(adj["night_game_spend_boost_pct"]) / 100.0)

    promo = promotion_type
    if promo == "student_push":
        mult *= 1.0 - (float(adj["student_push_spend_drop_pct"]) / 100.0)
    elif promo == "family_bundle":
        mult *= 1.0 - (float(adj["family_bundle_spend_drop_pct"]) / 100.0)
    elif promo == "alumni_night":
        mult *= 1.0 + (float(adj["alumni_night_spend_boost_pct"]) / 100.0)
    elif promo == "rivalry_hype":
        mult *= 1.0 + (float(adj["rivalry_hype_spend_boost_pct"]) / 100.0)

    revenue_students = student_count * per_student * mult
    revenue_non = nonstudent_count * per_non * mult
    revenue_total = revenue_students + revenue_non

    margin_student = float(menu["segments"]["student"]["gross_margin_pct"]) / 100.0
    margin_non = float(menu["segments"]["nonstudent"]["gross_margin_pct"]) / 100.0
    gross_margin = revenue_students * margin_student + revenue_non * margin_non

    # Revenue uncertainty (percentage), then map to dollars
    sd_rev_pct = 0.06
    sd_rev_pct += 0.04 * abs(student_ratio - 0.18)
    sd_rev_pct += 0.02 if weather_temp_f <= 45 else 0.0
    sd_rev_pct += 0.01 if _is_night(kickoff_time_local) else 0.0
    sd_rev_pct = float(_clamp(sd_rev_pct, 0.05, 0.14))
    ci_rev_low = float(revenue_total * (1.0 - 1.645 * sd_rev_pct))
    ci_rev_high = float(revenue_total * (1.0 + 1.645 * sd_rev_pct))

    conc = venue["concessions"]
    stands_total = int(conc["stands_total"])
    stands_open = max(1, int(round(stands_total * (stands_open_pct / 100.0))))
    staff_per_stand = max(1, int(staff_per_stand))
    service_rate = float(conc["service_rate_customers_per_staff_per_min"])
    boost = float(conc["express_lane_service_boost_pct"]) / 100.0 if express_lanes else 0.0

    capacity_per_min = stands_open * staff_per_stand * service_rate * (1.0 + boost)

    def mm_s_metrics(*, arrivals_per_min: float, stands_open: int, mu_per_stand: float) -> dict[str, float]:
        """
        M/M/s-inspired approximation with Erlang-C in log-space for stability.
        Servers = stands_open, service rate per server = mu_per_stand (customers/min).
        """
        s = max(1, int(stands_open))
        mu = max(1e-6, float(mu_per_stand))
        lam = max(0.0, float(arrivals_per_min))

        a = lam / mu  # offered load
        if a <= 0:
            return {"rho": 0.0, "p_wait": 0.0, "wq_min": 0.0, "p_wait_gt_15": 0.0}
        if a >= s:
            # Unstable / overloaded
            return {"rho": 1.5, "p_wait": 1.0, "wq_min": 45.0, "p_wait_gt_15": 1.0}

        rho = a / s

        def logsumexp(log_terms: list[float]) -> float:
            m = max(log_terms)
            return m + math.log(sum(math.exp(t - m) for t in log_terms))

        # log(sum_{k=0}^{s-1} a^k/k!)
        log_terms = []
        for k in range(s):
            if k == 0:
                log_terms.append(0.0)
            else:
                log_terms.append(k * math.log(a) - math.lgamma(k + 1))
        log_sum = logsumexp(log_terms[:-1])  # up to s-1

        # log(a^s/s! * s/(s-a))
        log_b = (s * math.log(a) - math.lgamma(s + 1)) + math.log(s / (s - a))

        # Erlang C
        denom = math.exp(log_sum) + math.exp(log_b)
        p_wait = math.exp(log_b) / denom

        # Expected waiting time in queue
        wq = p_wait / (s * mu - lam)

        # SLA breach probability for wait > 15 minutes (M/M/s queue tail approx)
        p_gt_15 = p_wait * math.exp(-(s * mu - lam) * 15.0)

        return {
            "rho": float(rho),
            "p_wait": float(_clamp(p_wait, 0.0, 1.0)),
            "wq_min": float(_clamp(wq, 0.0, 60.0)),
            "p_wait_gt_15": float(_clamp(p_gt_15, 0.0, 1.0)),
        }

    # Simple arrival windows; values are % of attendance who attempt a purchase in that window.
    windows = [
        ("pre_kick", 60, 0.12 + (0.02 if early_arrival_promo else 0.0)),
        ("halftime", 20, 0.18),
        ("q4", 15, 0.06),
    ]

    wait_windows: list[dict[str, Any]] = []
    worst_util = 0.0
    worst_p_wait_gt_15 = 0.0
    for name, minutes, pct in windows:
        customers = attendance * pct
        arrivals_per_min = customers / minutes if minutes > 0 else customers
        util = arrivals_per_min / max(capacity_per_min, 1e-6)
        worst_util = max(worst_util, util)

        # Queue-ish metrics per window (stand-level servers)
        mu_per_stand = staff_per_stand * service_rate * (1.0 + boost)
        q = mm_s_metrics(arrivals_per_min=arrivals_per_min, stands_open=stands_open, mu_per_stand=mu_per_stand)
        worst_p_wait_gt_15 = max(worst_p_wait_gt_15, float(q["p_wait_gt_15"]))

        if util <= 0.75:
            wait = (3, 8)
        elif util <= 0.90:
            wait = (8, 15)
        elif util <= 1.05:
            wait = (15, 28)
        else:
            wait = (28, 45)

        wait_windows.append(
            {
                "window": name,
                "arrivals_per_min": float(arrivals_per_min),
                "capacity_per_min": float(capacity_per_min),
                "utilization": float(util),
                "wait_minutes_band": [int(wait[0]), int(wait[1])],
                "queue": {
                    "rho": q["rho"],
                    "p_wait": q["p_wait"],
                    "wq_min": q["wq_min"],
                    "p_wait_gt_15": q["p_wait_gt_15"],
                },
            }
        )

    # Staffing recommendation: how many staff/stand to keep halftime util <= 0.9
    halftime = next(w for w in wait_windows if w["window"] == "halftime")
    halftime_arrivals = halftime["arrivals_per_min"]
    required_staff_per_stand = math.ceil(
        halftime_arrivals
        / max(stands_open, 1)
        / max(service_rate, 1e-6)
        / max(0.90 * (1.0 + boost), 1e-6)
    )
    required_staff_per_stand = int(max(1, min(required_staff_per_stand, 20)))

    # Simple window-by-window staffing plan: keep rho <= 0.90 with a floor of current staff.
    staffing_plan = []
    for w in wait_windows:
        arrivals = float(w["arrivals_per_min"])
        # target lam <= 0.90 * stands * mu_per_stand
        # mu_per_stand = staff * service_rate * (1+boost)
        target_staff = math.ceil(
            arrivals
            / max(stands_open, 1)
            / max(service_rate, 1e-6)
            / max(0.90 * (1.0 + boost), 1e-6)
        )
        target_staff = int(max(1, min(target_staff, 20)))
        staffing_plan.append(
            {
                "window": w["window"],
                "recommended_staff_per_stand": target_staff,
            }
        )

    return {
        "revenue_total_usd": float(revenue_total),
        "revenue_total_usd_ci_low": float(ci_rev_low),
        "revenue_total_usd_ci_high": float(ci_rev_high),
        "revenue_students_usd": float(revenue_students),
        "revenue_nonstudents_usd": float(revenue_non),
        "gross_margin_usd": float(gross_margin),
        "per_cap_spend_usd": float(revenue_total / attendance) if attendance > 0 else 0.0,
        "ops": {
            "stands_total": stands_total,
            "stands_open": stands_open,
            "stands_open_pct": int(stands_open_pct),
            "staff_per_stand": int(staff_per_stand),
            "capacity_per_min": float(capacity_per_min),
            "wait_time_windows": wait_windows,
            "worst_utilization": float(worst_util),
            "worst_p_wait_gt_15": float(worst_p_wait_gt_15),
            "recommended_staff_per_stand": required_staff_per_stand,
            "staffing_plan": staffing_plan,
        },
        "assumptions": {
            "service_rate_customers_per_staff_per_min": service_rate,
            "express_lane_service_boost_pct": float(conc["express_lane_service_boost_pct"]),
            "arrival_windows": [
                {"window": name, "minutes": minutes, "demand_pct": pct} for name, minutes, pct in windows
            ],
            "menu_segments": menu["segments"],
            "adjustments": menu["adjustments"],
        },
        "uncertainty": {
            "ci_level": 0.90,
            "sd_revenue_pct": sd_rev_pct,
            "drivers": {
                "student_ratio": float(student_ratio),
                "cold_weather": bool(weather_temp_f <= 45),
                "night_game": bool(_is_night(kickoff_time_local)),
                "promotion_type": promotion_type,
            },
        },
    }


def engine_assumptions_snapshot() -> dict[str, Any]:
    venue = load_venue()
    menu = load_concessions_menu()
    return {
        "hfa_engine": {
            "description": "Deterministic logistic-ish model producing win probability (mock).",
            "notes": [
                "Attendance and student mix drive small, saturating deltas.",
                "Crowd energy is a direct lever and adds a bounded bump.",
            ],
        },
        "noise_engine": {
            "description": "Energy slider + context to projected stadium decibels (mock).",
            "bounds_db": [85, 118],
        },
        "concessions_engine": {
            "description": "Revenue + simple queue approximation over time windows (mock).",
            "venue_defaults": venue["concessions"],
            "menu_defaults": menu,
        },
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


