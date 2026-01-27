"""Monte Carlo simulation for uncertainty quantification."""

import random
from typing import List, Dict, Any
from .mock_model import predict_hfa, predict_loudness_db, simulate_concessions


def run_monte_carlo(
    game_id: str,
    base_overrides: Dict[str, Any],
    n_simulations: int = 500,
    variation_pct: float = 0.10,
) -> Dict[str, Any]:
    """
    Run Monte Carlo simulation by varying inputs around base values.
    
    Args:
        game_id: Game identifier
        base_overrides: Base scenario overrides
        n_simulations: Number of simulation runs
        variation_pct: Percentage variation for inputs (+/- this amount)
    
    Returns:
        Distribution statistics for key outputs
    """
    
    # Extract base values with defaults
    base_attendance = base_overrides.get("attendance", 100000)
    base_student_ratio = base_overrides.get("student_ratio", 0.22)
    base_crowd_energy = base_overrides.get("crowd_energy", 78)
    base_stands_open = base_overrides.get("stands_open_pct", 85)
    base_staff = base_overrides.get("staff_per_stand", 6)
    
    # Results accumulators
    win_probs: List[float] = []
    decibels_list: List[float] = []
    revenues: List[float] = []
    utilizations: List[float] = []
    
    for _ in range(n_simulations):
        # Add random variation to inputs
        attendance = int(base_attendance * (1 + random.uniform(-variation_pct, variation_pct)))
        attendance = max(80000, min(110000, attendance))
        
        student_ratio = base_student_ratio * (1 + random.uniform(-variation_pct, variation_pct))
        student_ratio = max(0.10, min(0.30, student_ratio))
        
        crowd_energy = base_crowd_energy * (1 + random.uniform(-variation_pct, variation_pct))
        crowd_energy = max(50, min(100, crowd_energy))
        
        stands_open = base_stands_open * (1 + random.uniform(-variation_pct * 0.5, variation_pct * 0.5))
        stands_open = max(70, min(100, stands_open))
        
        staff = base_staff + random.randint(-1, 1)
        staff = max(4, min(12, staff))
        
        # Run simulations
        hfa = predict_hfa(
            game_id=game_id,
            attendance=attendance,
            student_ratio=student_ratio,
            rival_flag=True,
            prior_home_win_rate=0.85,
        )
        
        noise = predict_loudness_db(
            attendance=attendance,
            student_ratio=student_ratio,
            crowd_energy=int(crowd_energy),
        )
        
        concessions = simulate_concessions(
            attendance=attendance,
            student_ratio=student_ratio,
            stands_open_pct=stands_open,
            staff_per_stand=staff,
            express_lanes=base_overrides.get("express_lanes", False),
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

