from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field


PromotionType = Literal[
    "none",
    "student_push",
    "alumni_night",
    "family_bundle",
    "rivalry_hype",
]


class Game(BaseModel):
    game_id: str
    date: date
    home_team: str
    away_team: str
    sport: str = "football"
    venue_name: str
    venue_capacity: int = Field(ge=1)
    kickoff_time_local: str = Field(description="HH:MM (24h) local time")

    # Context
    rivalry_flag: bool = False
    game_stakes: Literal["conference", "non_conf", "rivalry", "playoff"] = "conference"
    opponent_rank: int | None = Field(default=None, ge=1, le=25)
    home_team_rank: int | None = Field(default=None, ge=1, le=25)

    # Baseline crowd assumptions
    baseline_attendance: int = Field(ge=0)
    baseline_student_ratio: float = Field(ge=0.0, le=1.0)

    # Baseline weather assumptions
    baseline_weather_temp_f: int
    baseline_weather_wind_mph: int = Field(ge=0)
    baseline_weather_precip_chance: int = Field(ge=0, le=100)

    # Baseline promotions
    baseline_promotion_type: PromotionType = "none"


class ScenarioOverrides(BaseModel):
    # Competitive/crowd
    attendance: int | None = Field(default=None, ge=0)
    student_ratio: float | None = Field(default=None, ge=0.0, le=1.0)
    opponent_rank: int | None = Field(default=None, ge=1, le=25)
    home_team_rank: int | None = Field(default=None, ge=1, le=25)
    kickoff_time_local: str | None = Field(default=None, description="HH:MM (24h)")
    weather_wind_mph: int | None = Field(default=None, ge=0)
    weather_temp_f: int | None = Field(default=None)
    weather_precip_chance: int | None = Field(default=None, ge=0, le=100)
    promotion_type: PromotionType | None = None

    # Atmosphere
    crowd_energy: int | None = Field(default=None, ge=0, le=100, description="0-100 crowd energy")

    # Concessions ops
    stands_open_pct: int | None = Field(default=None, ge=10, le=100)
    staff_per_stand: int | None = Field(default=None, ge=1, le=20)
    express_lanes: bool | None = None
    early_arrival_promo: bool | None = None


class SimulateRequest(BaseModel):
    overrides: ScenarioOverrides = Field(default_factory=ScenarioOverrides)


class ScenarioRequest(BaseModel):
    attendance: int = Field(ge=0)
    student_ratio: float = Field(ge=0.0, le=1.0)
    rival_game: bool = False
    opponent_rank: int = Field(ge=1, le=25, description="25 = unranked proxy")
    home_rank: int = Field(ge=1, le=25, description="25 = unranked proxy")
    weather_wind: int = Field(ge=0)
    kickoff_time_local: str = Field(default="12:00", description="HH:MM (24h)")
    promotion: PromotionType = "none"
    crowd_energy: int = Field(default=70, ge=0, le=100)


class WhatIfRequest(BaseModel):
    base_scenario: ScenarioRequest
    changes: dict[str, Any]


class RecommendationsRequest(BaseModel):
    scenario: ScenarioRequest
    max_attendance_increase: int = Field(default=5000, ge=0)
    max_student_ratio_increase: float = Field(default=0.03, ge=0.0, le=0.25)


class HealthResponse(BaseModel):
    status: str


class GamesListResponse(BaseModel):
    games: list[Game]


class GameDetailResponse(BaseModel):
    game: Game


class NotImplementedResponse(BaseModel):
    detail: str
    hint: str | None = None
    meta: dict[str, Any] | None = None


class HfaResponse(BaseModel):
    predicted_win_probability: float
    predicted_win_probability_ci_low: float | None = None
    predicted_win_probability_ci_high: float | None = None
    uncertainty: dict[str, Any] | None = None
    feature_contributions_pp: dict[str, float]
    terms_logit: dict[str, float]
    intercept_logit: float


class CombinedSimResult(BaseModel):
    hfa: HfaResponse
    noise: dict[str, Any]
    concessions: dict[str, Any]


class GameSimulateResponse(BaseModel):
    game_id: str
    baseline: CombinedSimResult
    counterfactual: CombinedSimResult
    delta_win_probability: float
    engine_assumptions: dict[str, Any]


class OptimizeRequest(BaseModel):
    # Starting point (optional): if omitted, use game baseline.
    current_overrides: ScenarioOverrides = Field(default_factory=ScenarioOverrides)

    # Constraints
    max_attendance_increase: int = Field(default=5000, ge=0)
    max_student_ratio_increase: float = Field(default=0.03, ge=0.0, le=0.25)
    max_crowd_energy_increase: int = Field(default=25, ge=0, le=100)
    max_staff_per_stand: int = Field(default=12, ge=1, le=20)
    min_stands_open_pct: int = Field(default=80, ge=10, le=100)

    # Objective
    target_delta_win_pp: float | None = Field(default=None, description="Optional target delta win prob (percentage points)")


class OptimizeCandidate(BaseModel):
    overrides: dict[str, Any]
    delta_win_probability: float
    ops_worst_utilization: float
    revenue_total_usd: float
    score: float


class OptimizeResponse(BaseModel):
    game_id: str
    recommended: OptimizeCandidate
    alternatives: list[OptimizeCandidate]


class CalibrationBucket(BaseModel):
    bin_lo: float
    bin_hi: float
    count: int
    avg_pred: float
    avg_obs: float | None = None


class CalibrationResponse(BaseModel):
    model: str
    n: int
    bins: int
    brier: float
    buckets: list[CalibrationBucket]


class ScenarioCreateRequest(BaseModel):
    game_id: str
    overrides: dict[str, Any] = Field(default_factory=dict)
    note: str | None = None


class SavedScenarioResponse(BaseModel):
    scenario_id: str
    game_id: str
    overrides: dict[str, Any]
    note: str | None = None
    created_at: str


class ScenariosListResponse(BaseModel):
    scenarios: list[SavedScenarioResponse]


class SensitivityResponse(BaseModel):
    game_id: str
    attendance: list[int]
    student_ratio: list[float]
    win_probability: list[list[float]]
    meta: dict[str, Any] | None = None


