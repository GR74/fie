export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = (() => {
    // Client can use relative /api. Server sometimes needs absolute.
    if (typeof window !== "undefined") return API_BASE_URL;
    if (!API_BASE_URL.startsWith("/")) return API_BASE_URL;
    const origin =
      process.env.NEXT_PUBLIC_SITE_ORIGIN ??
      process.env.SITE_ORIGIN ??
      "http://localhost:3000";
    return `${origin}${API_BASE_URL}`;
  })();

  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText}: ${text || path}`);
  }
  return (await res.json()) as T;
}

export type PromotionType =
  | "none"
  | "student_push"
  | "alumni_night"
  | "family_bundle"
  | "rivalry_hype";

export type Game = {
  game_id: string;
  date: string;
  home_team: string;
  away_team: string;
  sport: string;
  venue_id?: string | null;
  venue_name: string;
  venue_capacity: number;
  is_indoor?: boolean;
  alternate_venue_id?: string | null;
  alternate_venue_name?: string | null;
  alternate_venue_capacity?: number | null;
  league_preset?: "college_football" | "college_other" | "minor_league" | "startup_league" | null;
  kickoff_time_local: string;
  rivalry_flag: boolean;
  game_stakes: string;
  opponent_rank: number | null;
  home_team_rank: number | null;
  baseline_attendance: number;
  baseline_student_ratio: number;
  baseline_weather_temp_f: number;
  baseline_weather_wind_mph: number;
  baseline_weather_precip_chance: number;
  baseline_promotion_type: PromotionType;
};

export type GamesListResponse = { games: Game[] };
export type GameDetailResponse = { game: Game };

export type SimulateOverrides = Partial<{
  venue_id: string;
  attendance: number;
  student_ratio: number;
  opponent_rank: number;
  home_team_rank: number;
  kickoff_time_local: string;
  weather_wind_mph: number;
  weather_temp_f: number;
  weather_precip_chance: number;
  promotion_type: PromotionType;
  crowd_energy: number;
  stands_open_pct: number;
  staff_per_stand: number;
  seats_open_pct: number;
  express_lanes: boolean;
  early_arrival_promo: boolean;
}>;

export type HfaResponse = {
  predicted_win_probability: number;
  predicted_win_probability_ci_low?: number;
  predicted_win_probability_ci_high?: number;
  uncertainty?: Record<string, unknown>;
  feature_contributions_pp: Record<string, number>;
  terms_logit: Record<string, number>;
  intercept_logit: number;
};

export type ConcessionsOps = {
  stands_total: number;
  stands_open: number;
  stands_open_pct: number;
  staff_per_stand: number;
  capacity_per_min: number;
  worst_utilization: number;
  worst_p_wait_gt_15?: number;
  recommended_staff_per_stand: number;
  staffing_plan?: Array<{ window: string; recommended_staff_per_stand: number }>;
  wait_time_windows: Array<{
    window: string;
    arrivals_per_min: number;
    capacity_per_min: number;
    utilization: number;
    wait_minutes_band: [number, number];
    queue?: {
      rho: number;
      p_wait: number;
      wq_min: number;
      p_wait_gt_15: number;
    };
  }>;
};

export type CombinedSimResult = {
  hfa: HfaResponse;
  noise: {
    projected_decibels: number;
    projected_decibels_ci_low?: number;
    projected_decibels_ci_high?: number;
    uncertainty?: Record<string, unknown>;
    energy_score: number;
  };
  concessions: {
    revenue_total_usd: number;
    revenue_total_usd_ci_low?: number;
    revenue_total_usd_ci_high?: number;
    revenue_students_usd: number;
    revenue_nonstudents_usd: number;
    gross_margin_usd: number;
    per_cap_spend_usd: number;
    ops: ConcessionsOps;
    assumptions: Record<string, unknown>;
    uncertainty?: Record<string, unknown>;
  };
};

export type GameSimulateResponse = {
  game_id: string;
  baseline: CombinedSimResult;
  counterfactual: CombinedSimResult;
  delta_win_probability: number;
  engine_assumptions: Record<string, unknown>;
};

export async function getGames() {
  return apiFetch<GamesListResponse>("/games");
}

export async function getGame(gameId: string) {
  return apiFetch<GameDetailResponse>(`/games/${encodeURIComponent(gameId)}`);
}

export async function simulateGame(gameId: string, overrides: SimulateOverrides) {
  return apiFetch<GameSimulateResponse>(
    `/games/${encodeURIComponent(gameId)}/simulate`,
    {
      method: "POST",
      body: JSON.stringify({ overrides }),
    },
  );
}

export type ObjectiveMode = "profit" | "fan_growth" | "mission";

export type OptimizeRequest = {
  current_overrides?: SimulateOverrides;
  max_attendance_increase?: number;
  max_student_ratio_increase?: number;
  max_crowd_energy_increase?: number;
  max_staff_per_stand?: number;
  min_stands_open_pct?: number;
  target_delta_win_pp?: number | null;
  objective_mode?: ObjectiveMode;
};

export type OptimizeCandidate = {
  overrides: Record<string, unknown>;
  delta_win_probability: number;
  ops_worst_utilization: number;
  revenue_total_usd: number;
  score: number;
};

export type OptimizeResponse = {
  game_id: string;
  recommended: OptimizeCandidate;
  alternatives: OptimizeCandidate[];
};

export async function optimizeGame(gameId: string, req: OptimizeRequest) {
  return apiFetch<OptimizeResponse>(`/games/${encodeURIComponent(gameId)}/optimize`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export type SavedScenario = {
  scenario_id: string;
  game_id: string;
  overrides: Record<string, unknown>;
  note?: string | null;
  created_at: string;
};

export async function listScenarios() {
  return apiFetch<{ scenarios: SavedScenario[] }>("/scenarios");
}

export async function createScenario(payload: {
  game_id: string;
  overrides: Record<string, unknown>;
  note?: string | null;
}) {
  return apiFetch<SavedScenario>("/scenarios", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteScenario(scenarioId: string) {
  return apiFetch<{ deleted: true }>(`/scenarios/${encodeURIComponent(scenarioId)}`, {
    method: "DELETE",
  });
}

export type GlobalScenario = {
  attendance: number;
  student_ratio: number;
  rival_game: boolean;
  opponent_rank: number;
  home_rank: number;
  weather_wind: number;
  kickoff_time_local: string;
  promotion: PromotionType;
  crowd_energy: number;
};

export async function predictHfa(scenario: GlobalScenario) {
  return apiFetch<HfaResponse>("/predict/hfa", {
    method: "POST",
    body: JSON.stringify(scenario),
  });
}

export async function simulateWhatIf(base: GlobalScenario, changes: Partial<GlobalScenario>) {
  return apiFetch<{
    baseline_win_prob: number;
    counterfactual_win_prob: number;
    delta_win_prob: number;
    changes_applied: Record<string, unknown>;
  }>("/simulate/what-if", {
    method: "POST",
    body: JSON.stringify({ base_scenario: base, changes }),
  });
}

export async function getRecommendations(scenario: GlobalScenario) {
  return apiFetch<{
    baseline_win_prob: number;
    recommendations: Array<{ lever: string; change: string; delta_pp: number }>;
  }>("/recommendations", {
    method: "POST",
    body: JSON.stringify({ scenario }),
  });
}

export type HfaCalibrationBin = {
  bin_lo: number;
  bin_hi: number;
  p_mean: number | null;
  y_mean: number | null;
  n: number;
};

export type HfaCalibrationReport = {
  n: number;
  brier_uncalibrated: number;
  brier_calibrated: number;
  bins_uncalibrated: HfaCalibrationBin[];
  bins_calibrated: HfaCalibrationBin[];
  notes: string[];
};

export async function getHfaCalibration() {
  return apiFetch<HfaCalibrationReport>("/calibration/hfa");
}


