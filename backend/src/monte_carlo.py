"""Monte Carlo simulation for uncertainty quantification."""

import random
from typing import Any, Dict, List

from .mock_model import HfaInputs, predict_hfa, predict_loudness_db, simulate_concessions


def run_monte_carlo(
    game: Any,
    venue: dict,
    base_overrides: Dict[str, Any],
    n_simulations: int = 500,
    variation_pct: float = 0.10,
) -> Dict[str, Any]:
    """
    Run Monte Carlo simulation by varying inputs around base values.

    Args:
        game: Game object (Pydantic model from storage)
        venue: Resolved venue dict (with concessions, capacity, is_indoor, etc.)
        base_overrides: Base scenario overrides (attendance, student_ratio, etc.)
        n_simulations: Number of simulation runs
        variation_pct: Percentage variation for inputs (+/- this amount)

    Returns:
        Distribution statistics for key outputs
    """

    venue_capacity = int(base_overrides.get("venue_capacity", game.venue_capacity))
    is_indoor = bool(venue.get("is_indoor", False))

    # Extract base values with defaults
    base_attendance = base_overrides.get("attendance", game.baseline_attendance)
    base_student_ratio = base_overrides.get("student_ratio", game.baseline_student_ratio)
    base_crowd_energy = base_overrides.get("crowd_energy", 78)
    base_stands_open = base_overrides.get("stands_open_pct", 85)
    base_staff = base_overrides.get("staff_per_stand", 6)

    # Fixed context (not varied)
    kickoff_time_local = str(base_overrides.get("kickoff_time_local", game.kickoff_time_local))
    weather_wind_mph = int(base_overrides.get("weather_wind_mph", game.baseline_weather_wind_mph))
    weather_temp_f = int(base_overrides.get("weather_temp_f", game.baseline_weather_temp_f))
    promotion_type = base_overrides.get("promotion_type", game.baseline_promotion_type)
    express_lanes = bool(base_overrides.get("express_lanes", False))
    early_arrival_promo = bool(base_overrides.get("early_arrival_promo", False))
    seats_open_pct = int(base_overrides.get("seats_open_pct", 100))

    # Clamp bounds based on actual venue capacity
    min_attendance = max(0, int(venue_capacity * 0.5))
    max_attendance = int(venue_capacity * 1.1)

    # Results accumulators
    win_probs: List[float] = []
    decibels_list: List[float] = []
    revenues: List[float] = []
    utilizations: List[float] = []

    for _ in range(n_simulations):
        # Add random variation to inputs
        attendance = int(base_attendance * (1 + random.uniform(-variation_pct, variation_pct)))
        attendance = max(min_attendance, min(max_attendance, attendance))

        student_ratio = base_student_ratio * (1 + random.uniform(-variation_pct, variation_pct))
        student_ratio = max(0.10, min(0.30, student_ratio))

        crowd_energy = base_crowd_energy * (1 + random.uniform(-variation_pct, variation_pct))
        crowd_energy = max(50, min(100, crowd_energy))

        stands_open = base_stands_open * (1 + random.uniform(-variation_pct * 0.5, variation_pct * 0.5))
        stands_open = max(70, min(100, stands_open))

        staff = base_staff + random.randint(-1, 1)
        staff = max(4, min(12, staff))

        effective_cap = max(1, int(venue_capacity * seats_open_pct / 100))

        # Run simulations
        hfa = predict_hfa(
            HfaInputs(
                attendance=attendance,
                venue_capacity=effective_cap,
                student_ratio=student_ratio,
                rivalry_flag=bool(game.rivalry_flag),
                opponent_rank=int(game.opponent_rank or 25),
                home_team_rank=int(game.home_team_rank or 25),
                weather_wind_mph=weather_wind_mph,
                kickoff_time_local=kickoff_time_local,
                promotion_type=promotion_type,
                crowd_energy=int(crowd_energy),
                is_indoor=is_indoor,
            )
        )

        noise = predict_loudness_db(
            attendance=attendance,
            venue_capacity=venue_capacity,
            rivalry_flag=bool(game.rivalry_flag),
            kickoff_time_local=kickoff_time_local,
            crowd_energy=int(crowd_energy),
            student_ratio=student_ratio,
            is_indoor=is_indoor,
            weather_temp_f=weather_temp_f,
        )

        concessions = simulate_concessions(
            attendance=attendance,
            student_ratio=student_ratio,
            kickoff_time_local=kickoff_time_local,
            weather_temp_f=weather_temp_f,
            promotion_type=promotion_type,
            stands_open_pct=int(stands_open),
            staff_per_stand=staff,
            express_lanes=express_lanes,
            early_arrival_promo=early_arrival_promo,
            venue=venue,
            is_indoor=is_indoor,
        )

        # Collect results
        win_probs.append(hfa["predicted_win_probability"])
        decibels_list.append(noise["projected_decibels"])
        revenues.append(concessions["revenue_total_usd"])
        utilizations.append(concessions["ops"]["worst_utilization"])
    
    def compute_stats(values: List[float]) -> Dict[str, float]:
        sorted_vals = sorted(values)
        n = len(sorted_vals)
        return {
            "mean": sum(values) / n,
            "std": (sum((v - sum(values)/n)**2 for v in values) / n) ** 0.5,
            "min": sorted_vals[0],
            "max": sorted_vals[-1],
            "p5": sorted_vals[int(n * 0.05)],
            "p25": sorted_vals[int(n * 0.25)],
            "p50": sorted_vals[int(n * 0.50)],
            "p75": sorted_vals[int(n * 0.75)],
            "p95": sorted_vals[int(n * 0.95)],
        }
    
    # Create histogram bins for visualization
    def make_histogram(values: List[float], n_bins: int = 20) -> List[Dict[str, float]]:
        min_val = min(values)
        max_val = max(values)
        bin_width = (max_val - min_val) / n_bins if max_val > min_val else 1
        
        bins = []
        for i in range(n_bins):
            bin_start = min_val + i * bin_width
            bin_end = bin_start + bin_width
            count = sum(1 for v in values if bin_start <= v < bin_end)
            bins.append({
                "bin_start": bin_start,
                "bin_end": bin_end,
                "bin_center": (bin_start + bin_end) / 2,
                "count": count,
                "frequency": count / len(values),
            })
        return bins
    
    return {
        "n_simulations": n_simulations,
        "variation_pct": variation_pct,
        "win_probability": {
            "stats": compute_stats(win_probs),
            "histogram": make_histogram(win_probs),
            "values": win_probs,  # Raw values for plotting
        },
        "decibels": {
            "stats": compute_stats(decibels_list),
            "histogram": make_histogram(decibels_list),
            "values": decibels_list,
        },
        "revenue": {
            "stats": compute_stats(revenues),
            "histogram": make_histogram(revenues),
            "values": revenues,
        },
        "utilization": {
            "stats": compute_stats(utilizations),
            "histogram": make_histogram(utilizations),
            "values": utilizations,
        },
    }

