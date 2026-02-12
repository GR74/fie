import type { Game, ObjectiveMode } from "@/lib/api";

export type SportId =
  | "football"
  | "basketball"
  | "volleyball"
  | "baseball"
  | "minor_league"
  | "startup_league";

export type SportScope = {
  id: SportId;
  label: string;
  shortLabel: string;
  category: string;
  description: string;
  eventTimeLabel: string;
  objectiveDefault: ObjectiveMode;
  isIndoor: boolean;
  ranges: {
    attendance: { min: number; max: number; step: number };
    studentRatioPermille: { min: number; max: number; step: number };
    crowdEnergy: { min: number; max: number; step: number };
    seatsOpenPct: { min: number; max: number; step: number };
    standsOpenPct: { min: number; max: number; step: number };
    staffPerStand: { min: number; max: number; step: number };
    windMph: { min: number; max: number; step: number };
  };
  defaults: {
    attendance: number;
    studentRatio: number;
    crowdEnergy: number;
    windMph: number;
  };
  bites: string[];
  filterGames: (game: Game) => boolean;
};

export const DEFAULT_SPORT: SportId = "football";

export const SPORT_SCOPES: SportScope[] = [
  {
    id: "football",
    label: "Football",
    shortLabel: "Football",
    category: "Ticketed flagship",
    description:
      "Peak-capacity Saturdays. Biggest HFA swings, weather sensitivity, and crowd-energy leverage.",
    eventTimeLabel: "Kickoff time",
    objectiveDefault: "profit",
    isIndoor: false,
    ranges: {
      attendance: { min: 85000, max: 106000, step: 250 },
      studentRatioPermille: { min: 120, max: 260, step: 1 },
      crowdEnergy: { min: 55, max: 100, step: 1 },
      seatsOpenPct: { min: 60, max: 100, step: 5 },
      standsOpenPct: { min: 70, max: 100, step: 1 },
      staffPerStand: { min: 4, max: 14, step: 1 },
      windMph: { min: 0, max: 25, step: 1 },
    },
    defaults: {
      attendance: 104000,
      studentRatio: 0.20,
      crowdEnergy: 78,
      windMph: 8,
    },
    bites: [
      "Tune rivalry vs non-conf demand curves.",
      "Adjust seats-open to boost perceived fill.",
      "Balance staffing vs peak halftime waits.",
    ],
    filterGames: (game) =>
      game.sport === "football" &&
      game.league_preset !== "minor_league" &&
      game.league_preset !== "startup_league",
  },
  {
    id: "basketball",
    label: "Basketball",
    shortLabel: "Basketball",
    category: "Ticketed arena",
    description:
      "Indoor arena leverage: Schott vs Covelli hosting, student mix, and tempo-driven concessions.",
    eventTimeLabel: "Tip-off time",
    objectiveDefault: "mission",
    isIndoor: true,
    ranges: {
      attendance: { min: 5000, max: 19000, step: 100 },
      studentRatioPermille: { min: 150, max: 420, step: 1 },
      crowdEnergy: { min: 50, max: 100, step: 1 },
      seatsOpenPct: { min: 40, max: 100, step: 5 },
      standsOpenPct: { min: 60, max: 100, step: 1 },
      staffPerStand: { min: 3, max: 12, step: 1 },
      windMph: { min: 0, max: 12, step: 1 },
    },
    defaults: {
      attendance: 14000,
      studentRatio: 0.22,
      crowdEnergy: 72,
      windMph: 0,
    },
    bites: [
      "Compare Schott vs Covelli hosting.",
      "Open fewer seats to boost fill rate.",
      "Prioritize student energy over margin.",
    ],
    filterGames: (game) =>
      game.sport === "basketball" &&
      game.league_preset !== "minor_league" &&
      game.league_preset !== "startup_league",
  },
  {
    id: "volleyball",
    label: "Volleyball",
    shortLabel: "Volleyball",
    category: "Ticketed indoor",
    description:
      "High-intensity, smaller bowl decisions: ticket caps, student allocation, and venue upgrades.",
    eventTimeLabel: "Serve time",
    objectiveDefault: "mission",
    isIndoor: true,
    ranges: {
      attendance: { min: 1500, max: 3500, step: 25 },
      studentRatioPermille: { min: 160, max: 450, step: 1 },
      crowdEnergy: { min: 55, max: 100, step: 1 },
      seatsOpenPct: { min: 50, max: 100, step: 5 },
      standsOpenPct: { min: 60, max: 100, step: 1 },
      staffPerStand: { min: 2, max: 10, step: 1 },
      windMph: { min: 0, max: 8, step: 1 },
    },
    defaults: {
      attendance: 3200,
      studentRatio: 0.32,
      crowdEnergy: 82,
      windMph: 0,
    },
    bites: [
      "Covelli vs Schott sizing tradeoffs.",
      "Push student mix for energy spikes.",
      "Optimize staffing for short bursts.",
    ],
    filterGames: (game) =>
      game.sport === "volleyball" &&
      game.league_preset !== "minor_league" &&
      game.league_preset !== "startup_league",
  },
  {
    id: "baseball",
    label: "Baseball",
    shortLabel: "Baseball",
    category: "Ticketed outdoor",
    description:
      "Longer event arcs: weather, family bundles, and steady concessions throughput.",
    eventTimeLabel: "First pitch",
    objectiveDefault: "mission",
    isIndoor: false,
    ranges: {
      attendance: { min: 1200, max: 12000, step: 50 },
      studentRatioPermille: { min: 120, max: 350, step: 1 },
      crowdEnergy: { min: 35, max: 90, step: 1 },
      seatsOpenPct: { min: 50, max: 100, step: 5 },
      standsOpenPct: { min: 50, max: 100, step: 1 },
      staffPerStand: { min: 2, max: 10, step: 1 },
      windMph: { min: 0, max: 18, step: 1 },
    },
    defaults: {
      attendance: 2000,
      studentRatio: 0.18,
      crowdEnergy: 55,
      windMph: 8,
    },
    bites: [
      "Bundle families to stabilize demand.",
      "Adjust seating zones vs fill.",
      "Dial staffing for long innings.",
    ],
    filterGames: (game) =>
      game.sport === "baseball" &&
      game.league_preset !== "minor_league" &&
      game.league_preset !== "startup_league",
  },
  {
    id: "minor_league",
    label: "Minor League",
    shortLabel: "Minor League",
    category: "Fan base growth",
    description:
      "Balance growth vs margin for affiliate clubs and non-premium inventory.",
    eventTimeLabel: "Start time",
    objectiveDefault: "fan_growth",
    isIndoor: false,
    ranges: {
      attendance: { min: 2000, max: 14000, step: 100 },
      studentRatioPermille: { min: 80, max: 280, step: 1 },
      crowdEnergy: { min: 40, max: 100, step: 1 },
      seatsOpenPct: { min: 40, max: 100, step: 5 },
      standsOpenPct: { min: 50, max: 100, step: 1 },
      staffPerStand: { min: 2, max: 12, step: 1 },
      windMph: { min: 0, max: 20, step: 1 },
    },
    defaults: {
      attendance: 8000,
      studentRatio: 0,
      crowdEnergy: 70,
      windMph: 6,
    },
    bites: [
      "Trade ticket yield for fan growth.",
      "Lean into promo nights.",
      "Test venue sizing vs atmosphere.",
    ],
    filterGames: (game) => game.league_preset === "minor_league",
  },
  {
    id: "startup_league",
    label: "Startup League",
    shortLabel: "Startup",
    category: "New market build",
    description:
      "Early-stage leagues: build atmosphere credibility before maximizing profit.",
    eventTimeLabel: "Start time",
    objectiveDefault: "fan_growth",
    isIndoor: false,
    ranges: {
      attendance: { min: 1500, max: 10000, step: 100 },
      studentRatioPermille: { min: 100, max: 320, step: 1 },
      crowdEnergy: { min: 45, max: 100, step: 1 },
      seatsOpenPct: { min: 40, max: 100, step: 5 },
      standsOpenPct: { min: 50, max: 100, step: 1 },
      staffPerStand: { min: 2, max: 10, step: 1 },
      windMph: { min: 0, max: 18, step: 1 },
    },
    defaults: {
      attendance: 5200,
      studentRatio: 0,
      crowdEnergy: 76,
      windMph: 4,
    },
    bites: [
      "Prioritize atmosphere over margin.",
      "Promote early arrival + repeat visits.",
      "Scale staffing with experiential goals.",
    ],
    filterGames: (game) => game.league_preset === "startup_league",
  },
];

export function getSportScope(id?: string | null): SportScope {
  const match = SPORT_SCOPES.find((sport) => sport.id === id);
  return match ?? SPORT_SCOPES.find((sport) => sport.id === DEFAULT_SPORT)!;
}

export function getSportScopeForGame(game?: Game | null): SportScope {
  if (!game) return getSportScope();
  const byLeague = SPORT_SCOPES.find(
    (sport) =>
      (sport.id === "minor_league" && game.league_preset === "minor_league") ||
      (sport.id === "startup_league" && game.league_preset === "startup_league"),
  );
  if (byLeague) return byLeague;
  return getSportScope(game.sport);
}

export function isProfessionalSportId(id?: string | null): boolean {
  return id === "minor_league" || id === "startup_league";
}

export function isProfessionalGame(game?: Game | null): boolean {
  if (!game) return false;
  return game.league_preset === "minor_league" || game.league_preset === "startup_league";
}

export function buildScenarioDefaults(sport: SportScope) {
  return {
    attendance: sport.defaults.attendance,
    student_ratio: sport.defaults.studentRatio,
    rival_game: sport.id === "football",
    opponent_rank: sport.id === "football" ? 6 : 14,
    home_rank: sport.id === "football" ? 4 : 12,
    weather_wind: sport.defaults.windMph,
    is_indoor: sport.isIndoor,
    kickoff_time_local: "19:00",
    promotion: "student_push" as const,
    crowd_energy: sport.defaults.crowdEnergy,
  };
}
