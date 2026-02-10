"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/cn";
import type { GameSimulateResponse, PromotionType, SimulateOverrides, EnrichedGame } from "@/lib/api";
import { createScenario, getGame, getEnrichedGame, optimizeGame, simulateGame } from "@/lib/api";
import { overridesToSearchParams, parseOverridesFromSearchParams } from "@/lib/scenarioUrl";
import { Chip, GlassButton, GlassCard, GlassSectionTitle, Control, Toggle } from "@/components/ui/glass";
import { HudDivider, StatBar } from "@/components/ui/hud";
import { useTelemetry } from "@/components/cinematic/Telemetry";
import { StadiumFillViz } from "@/components/viz/StadiumFillViz";
import { ConcessionStandsViz } from "@/components/viz/ConcessionStandsViz";
import { PerformanceGauges } from "@/components/viz/PerformanceGauges";
import { PresetSelector, PresetButtons } from "@/components/PresetSelector";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { DataBadge, DataSourceBar, ModelStatusBadge, WeatherBadge } from "@/components/ui/data-badge";
import { getSportScopeForGame, isProfessionalGame } from "@/lib/sports";
import { useKeyboardShortcuts, type ShortcutAction } from "@/hooks/useKeyboardShortcuts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Copy, Download, FileText, Settings2, RotateCcw } from "lucide-react";

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

function pctBand(lo?: number, hi?: number) {
  if (lo == null || hi == null) return null;
  return `${pct(lo)}–${pct(hi)} (90%)`;
}

function dbBand(lo?: number, hi?: number) {
  if (lo == null || hi == null) return null;
  return `${lo.toFixed(1)}–${hi.toFixed(1)} dB (90%)`;
}

function usd(x: number) {
  return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.id;
  const { setTelemetry } = useTelemetry();

  const [tab, setTab] = useState<"competitive" | "atmosphere" | "concessions" | "optimize">(
    "competitive",
  );

  const [overrides, setOverrides] = useState<SimulateOverrides>(() => {
    const parsed = parseOverridesFromSearchParams(new URLSearchParams(searchParams?.toString()));
    return { crowd_energy: 78, ...parsed };
  });

  const stableOverrides = useMemo(() => overrides, [overrides]);

  // Optimizer controls (kept tight for speed)
  const [optTarget, setOptTarget] = useState<number>(1.0);
  const [optMaxAtt, setOptMaxAtt] = useState<number>(5000);
  const [optMaxSr, setOptMaxSr] = useState<number>(0.03);
  const [optMaxEnergy, setOptMaxEnergy] = useState<number>(25);
  const [optMaxStaff, setOptMaxStaff] = useState<number>(12);
  const [optMinStands, setOptMinStands] = useState<number>(80);
  const [optObjectiveMode, setOptObjectiveMode] = useState<"profit" | "fan_growth" | "mission">("profit");

  const [optimizing, setOptimizing] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);

  const gameQuery = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => getGame(gameId),
  });

  const enrichedQuery = useQuery({
    queryKey: ["enriched", gameId],
    queryFn: () => getEnrichedGame(gameId),
    enabled: !!gameId,
    staleTime: 60_000 * 5, // 5 min cache — live data doesn't change that fast
    retry: 1,
  });

  const enriched = enrichedQuery.data;

  const simulateQuery = useQuery({
    queryKey: ["simulate", gameId, stableOverrides],
    queryFn: () => simulateGame(gameId, stableOverrides),
    enabled: !!gameId,
  });

  const game = gameQuery.data?.game;
  const sim = simulateQuery.data;
  const sportScope = getSportScopeForGame(game);
  const isProfessional = isProfessionalGame(game);
  const showStudentRatio = !isProfessional;

  const optimizeMutation = useMutation({
    mutationFn: () =>
      optimizeGame(gameId, {
        current_overrides: stableOverrides,
        target_delta_win_pp: optTarget,
        max_attendance_increase: optMaxAtt,
        max_student_ratio_increase: showStudentRatio ? optMaxSr : 0,
        max_crowd_energy_increase: optMaxEnergy,
        max_staff_per_stand: optMaxStaff,
        min_stands_open_pct: optMinStands,
        objective_mode: optObjectiveMode,
      }),
  });

  // Gentle initial defaults once game loads. Clamp student_ratio to sport range so UI and API agree.
  useEffect(() => {
    const g = gameQuery.data?.game;
    if (!g) return;
    const scope = getSportScopeForGame(g);
    const showSr = g.league_preset !== "minor_league" && g.league_preset !== "startup_league";
    setOverrides((prev) => {
      const next = {
        ...prev,
        crowd_energy: prev.crowd_energy ?? 78,
        stands_open_pct: prev.stands_open_pct ?? 85,
        staff_per_stand: prev.staff_per_stand ?? 6,
        seats_open_pct: prev.seats_open_pct ?? 100,
      };
      if (showSr) {
        const minR = scope.ranges.studentRatioPermille.min / 1000;
        const maxR = scope.ranges.studentRatioPermille.max / 1000;
        const current = prev.student_ratio ?? g.baseline_student_ratio ?? 0;
        if (current < minR || current > maxR) {
          next.student_ratio = Math.max(minR, Math.min(maxR, current));
        }
      }
      return next;
    });
  }, [gameQuery.data?.game]);

  // League preset: default objective for startup/minor league
  useEffect(() => {
    const preset = gameQuery.data?.game?.league_preset;
    if (preset === "startup_league" || preset === "minor_league") {
      setOptObjectiveMode("fan_growth");
      return;
    }
    if (preset === "college_other") {
      setOptObjectiveMode("mission");
      return;
    }
    setOptObjectiveMode(sportScope.objectiveDefault);
  }, [gameQuery.data?.game?.league_preset, sportScope.objectiveDefault]);

  // Keep overrides in the URL for sharing (debounced).
  const lastUrlRef = useRef<string>("");
  useEffect(() => {
    const timer = setTimeout(() => {
      const p = overridesToSearchParams(overrides);
      const qs = p.toString();
      const next = qs ? `?${qs}` : "";
      if (lastUrlRef.current === next) return;
      lastUrlRef.current = next;
      router.replace(next, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
  }, [overrides, router]);

  const baselineWin = sim?.baseline.hfa.predicted_win_probability ?? 0;
  const cfWin = sim?.counterfactual.hfa.predicted_win_probability ?? 0;
  const deltaWin = sim?.delta_win_probability ?? 0;

  const promoOptions: Array<{ value: PromotionType; label: string }> = [
    { value: "none", label: "None" },
    { value: "student_push", label: "Student push" },
    { value: "alumni_night", label: "Alumni night" },
    { value: "family_bundle", label: "Family bundle" },
    { value: "rivalry_hype", label: "Rivalry hype" },
  ];

  const contribChart = useMemo(() => {
    const c = sim?.counterfactual.hfa.feature_contributions_pp ?? {};
    const rows = Object.entries(c)
      .map(([k, v]) => {
        const pp = Number(v.toFixed(2));
        return {
          lever: k.replaceAll("_", " "),
          pos: pp > 0 ? pp : 0,
          neg: pp < 0 ? pp : 0,
          abs: Math.abs(pp),
        };
      })
      .sort((a, b) => b.abs - a.abs)
      .slice(0, 7);
    return rows;
  }, [sim?.counterfactual.hfa.feature_contributions_pp]);

  const contribDomain = useMemo(() => {
    const maxAbs = Math.max(1, ...contribChart.map((d: any) => d.abs ?? 0));
    const pad = maxAbs * 0.15;
    return [-maxAbs - pad, maxAbs + pad] as [number, number];
  }, [contribChart]);

  const isLoading = gameQuery.isLoading || simulateQuery.isLoading;
  const effectiveVenueCapacity =
    game && overrides.venue_id === game.alternate_venue_id
      ? (game.alternate_venue_capacity ?? game.venue_capacity)
      : game?.venue_capacity ?? 0;
  const effectiveVenueName =
    game && overrides.venue_id === game.alternate_venue_id
      ? (game.alternate_venue_name ?? game.venue_name)
      : game?.venue_name ?? "";
  const seatsOpen = overrides.seats_open_pct ?? 100;
  const effectiveCap = game ? Math.max(1, effectiveVenueCapacity * seatsOpen / 100) : 1;
  const fillPct = game
    ? ((overrides.attendance ?? game.baseline_attendance) / effectiveCap) * 100
    : 0;
  const attendanceMax = Math.min(
    sportScope.ranges.attendance.max,
    effectiveVenueCapacity ?? sportScope.ranges.attendance.max,
  );
  const attendanceMinRaw = Math.min(sportScope.ranges.attendance.min, attendanceMax);
  const attendanceMin =
    attendanceMinRaw >= attendanceMax
      ? Math.max(0, Math.floor(attendanceMax * 0.2))
      : attendanceMinRaw;

  useEffect(() => {
    if (!game) return;
    const cap = effectiveVenueCapacity || game.venue_capacity;
    const current = overrides.attendance ?? game.baseline_attendance;
    if (current > cap) {
      setOverrides((prev) => ({ ...prev, attendance: cap }));
    }
  }, [game, effectiveVenueCapacity, overrides.attendance]);

  // Feed cinematic telemetry so the 3D layer reacts to real outputs.
  useEffect(() => {
    if (!sim) return;
    setTelemetry({
      winDeltaPp: (sim.delta_win_probability ?? 0) * 100,
      decibels: sim.counterfactual.noise.projected_decibels ?? 95,
      opsUtil: sim.counterfactual.concessions.ops.worst_utilization ?? 0.8,
    });
  }, [sim, setTelemetry]);

  // Reset to baseline
  const resetToBaseline = () => {
    if (!game) return;
    setOverrides({
      crowd_energy: 78,
      stands_open_pct: 85,
      staff_per_stand: 6,
      seats_open_pct: 100,
    });
  };

  // Save scenario handler
  const handleSaveScenario = async () => {
    if (!game) return;
    const note = window.prompt("Scenario note (optional):") ?? null;
    await createScenario({
      game_id: game.game_id,
      overrides: overrides as any,
      note,
    });
  };

  // Keyboard shortcuts
  const shortcuts: ShortcutAction[] = useMemo(() => [
    { key: "s", meta: true, description: "Save scenario", action: handleSaveScenario },
    { key: "r", description: "Reset to baseline", action: resetToBaseline },
    { key: "1", description: "Competitive tab", action: () => setTab("competitive") },
    { key: "2", description: "Atmosphere tab", action: () => setTab("atmosphere") },
    { key: "3", description: "Concessions tab", action: () => setTab("concessions") },
    { key: "4", description: "Optimize tab", action: () => setTab("optimize") },
  ], [game, overrides]);

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="muted text-xs">
            <Link href="/games" className="hover:underline">
              Games
            </Link>{" "}
            <span className="muted">/</span> <span className="font-medium">{gameId}</span>
          </div>

          <div className="space-y-2">
            <h1 className="display text-4xl font-semibold tracking-tight sm:text-5xl">
              {game ? (
                <>
                  <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent dark:from-white dark:to-white/70">
                    {game.away_team}
                  </span>{" "}
                  <span className="muted">@</span>{" "}
                  <span className="bg-gradient-to-b from-[hsl(var(--scarlet-2))] to-[hsl(var(--scarlet))] bg-clip-text text-transparent">
                    {game.home_team}
                  </span>
                </>
              ) : (
                <span className="inline-block h-10 w-[22rem] animate-pulse rounded-2xl bg-white/10 align-middle" />
              )}
            </h1>
            {game ? (
              <div className="flex flex-wrap items-center gap-2">
                {game.rivalry_flag ? (
                  <Chip>
                    <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--scarlet))]" />
                    The Game • Rivalry
                  </Chip>
                ) : (
                  <Chip>{game.game_stakes}</Chip>
                )}
                <Chip>
                  {game.date} • {game.kickoff_time_local}
                </Chip>
                <Chip>
                  {effectiveVenueName || game.venue_name} • cap {(effectiveVenueCapacity || game.venue_capacity).toLocaleString()}
                </Chip>
              </div>
            ) : null}
            <p className="muted max-w-2xl text-sm">
              A high-fidelity, Ohio State–inspired simulator: crowd composition, loudness, and concessions ops all roll up
              into a single game-day decision surface.
            </p>

            {/* Live data indicators */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <ModelStatusBadge />
              {enriched?.weather && enriched.weather.source !== "N/A" && (
                <WeatherBadge
                  source={enriched.weather.source}
                  temp={enriched.weather.temp_f}
                  wind={enriched.weather.wind_mph}
                  conditions={enriched.weather.conditions}
                />
              )}
              {enriched?.live?._espn_matched && (
                <DataBadge status="LIVE" label="ESPN LIVE" />
              )}
              {enriched?.live?.live_attendance && (
                <span className="text-[11px] text-green-400">
                  Actual attendance: {enriched.live.live_attendance.toLocaleString()}
                </span>
              )}
              {enriched?.live?.live_broadcast && (
                <span className="text-[11px] text-zinc-400">
                  TV: {enriched.live.live_broadcast}
                </span>
              )}
            </div>
            {enriched?.data_sources && <DataSourceBar sources={enriched.data_sources} />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PresetSelector 
            onApply={(preset) => setOverrides((s) => ({ ...s, ...preset }))}
            hideStudentRatio={!showStudentRatio}
          />
          <GlassButton
            type="button"
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url).catch(() => {});
            }}
            title="Copy share link"
            aria-label="Copy share link"
          >
            <Copy className="h-4 w-4" /> Share
          </GlassButton>
          <GlassButton
            type="button"
            onClick={async () => {
              if (!game) return;
              const note = window.prompt("Scenario note (optional):") ?? null;
              await createScenario({
                game_id: game.game_id,
                overrides: overrides as any,
                note,
              });
            }}
            title="Save scenario"
            aria-label="Save scenario"
          >
            Save
          </GlassButton>
          <GlassButton
            type="button"
            onClick={() => {
              if (!sim || !game) return;
              const rows: Array<[string, string | number]> = [
                ["game_id", game.game_id],
                ["attendance_baseline", game.baseline_attendance],
                ["attendance_counterfactual", overrides.attendance ?? game.baseline_attendance],
                ["crowd_energy", overrides.crowd_energy ?? 78],
                ["win_prob_baseline", sim.baseline.hfa.predicted_win_probability],
                ["win_prob_counterfactual", sim.counterfactual.hfa.predicted_win_probability],
                ["delta_win_prob", sim.delta_win_probability],
                ["decibels_baseline", sim.baseline.noise.projected_decibels],
                ["decibels_counterfactual", sim.counterfactual.noise.projected_decibels],
                ["revenue_baseline_usd", sim.baseline.concessions.revenue_total_usd],
                ["revenue_counterfactual_usd", sim.counterfactual.concessions.revenue_total_usd],
              ];
              if (showStudentRatio) {
                rows.splice(3, 0,
                  ["student_ratio_baseline", game.baseline_student_ratio],
                  ["student_ratio_counterfactual", overrides.student_ratio ?? game.baseline_student_ratio],
                );
              }
              const csv = ["metric,value", ...rows.map(([k, v]) => `${k},${v}`)].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${game.game_id}_scenario.csv`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            title="Export scenario as CSV"
            disabled={!sim || !game}
            aria-label="Export scenario as CSV"
          >
            <Download className="h-4 w-4" /> CSV
          </GlassButton>
          <GlassButton
            type="button"
            onClick={resetToBaseline}
            title="Reset to baseline (R)"
            aria-label="Reset to baseline"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </GlassButton>
          <Link href={`/games/${gameId}/engine`}>
            <GlassButton type="button">
              <Settings2 className="h-4 w-4" /> Engine
            </GlassButton>
          </Link>
          <Link href={`/games/${gameId}/sensitivity`}>
            <GlassButton type="button">Surface</GlassButton>
          </Link>
          <ShortcutsHelp shortcuts={shortcuts} />
          <Link href={`/games/${gameId}/engine-report`}>
            <GlassButton type="button" variant="primary">
              <FileText className="h-4 w-4" /> Report
            </GlassButton>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatBar
          label="Stadium fill"
          value={`${fillPct.toFixed(1)}%`}
          sub="Attendance vs effective capacity"
          tone={fillPct >= 95 ? "scarlet" : fillPct >= 80 ? "good" : "neutral"}
          numericValue={fillPct}
          maxValue={100}
        />
        <StatBar
          label="Crowd energy"
          value={`${overrides.crowd_energy ?? 78}/100`}
          sub="Controls decibels + small HFA bump"
          tone="scarlet"
          numericValue={overrides.crowd_energy ?? 78}
          maxValue={100}
        />
        <StatBar
          label="Ops pressure"
          value={`${(((sim?.counterfactual.concessions.ops.worst_utilization ?? 0) as number) * 100).toFixed(0)}%`}
          sub="Worst concessions utilization"
          tone={
            (sim?.counterfactual.concessions.ops.worst_utilization ?? 0) > 1.0
              ? "bad"
              : (sim?.counterfactual.concessions.ops.worst_utilization ?? 0) > 0.9
                ? "neutral"
                : "good"
          }
          numericValue={(sim?.counterfactual.concessions.ops.worst_utilization ?? 0) * 100}
          maxValue={120}
        />
      </div>

      <HudDivider className="opacity-60" />

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Controls */}
        <GlassCard className="lg:col-span-4 p-4">
          <GlassSectionTitle
            title="Game Day Simulator"
            subtitle="Adjust levers; everything updates instantly."
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-primary rounded-full px-3 py-1 text-[11px] font-semibold"
                  disabled={!gameId || optimizing}
                  onClick={async () => {
                    try {
                      setOptimizing(true);
                      setOptError(null);
                      const res = await optimizeGame(gameId, {
                        current_overrides: overrides,
                        max_attendance_increase: 5000,
                        max_student_ratio_increase: showStudentRatio ? 0.03 : 0,
                        max_crowd_energy_increase: 25,
                        max_staff_per_stand: 10,
                        min_stands_open_pct: 80,
                        target_delta_win_pp: 1.0,
                        objective_mode: optObjectiveMode,
                      });
                      setOverrides((s) => ({ ...s, ...(res.recommended.overrides as any) }));
                    } catch (e: any) {
                      setOptError(String(e?.message ?? e));
                    } finally {
                      setOptimizing(false);
                    }
                  }}
                  title="Run optimizer and apply the recommended plan"
                >
                  {optimizing ? "Optimizing…" : "Optimize"}
                </button>
                <span className="chip rounded-full px-3 py-1 text-[11px] font-semibold muted">
                  {simulateQuery.isFetching ? "Updating…" : "Live"}
                </span>
              </div>
            }
          />
          <div className="muted mt-2 text-[11px]">
            Note: win-probability shifts have diminishing returns near extremes because the model uses a sigmoid.
          </div>

          <div className="mt-4 relative">
            <div className="grid grid-cols-4 gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.03)" }}>
              {(
                [
                  ["competitive", "Competitive", "\u2694\uFE0F"],
                  ["atmosphere", "Atmosphere", "\uD83C\uDFB5"],
                  ["concessions", "Concessions", "\uD83C\uDF7F"],
                  ["optimize", "Optimize", "\u26A1"],
                ] as const
              ).map(([k, label, icon]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cn(
                    "relative rounded-lg px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider transition-all duration-200",
                    tab === k
                      ? "text-white"
                      : "text-white/35 hover:text-white/55",
                  )}
                >
                  {tab === k && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: "linear-gradient(135deg, hsl(354 78% 45% / 0.4), hsl(354 78% 35% / 0.2))",
                        border: "1px solid hsl(354 78% 55% / 0.3)",
                        boxShadow: "0 0 15px hsl(354 78% 55% / 0.15)",
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {optError ? (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs">
              <div className="font-semibold">Optimizer error</div>
              <div className="muted mt-1">{optError}</div>
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            {/* Quick preset buttons */}
            <PresetButtons 
              onApply={(preset) => setOverrides((s) => ({ ...s, ...preset }))}
              hideStudentRatio={!showStudentRatio}
              className="pb-2 border-b border-white/10"
            />
            
            {tab === "competitive" && (
              <>
                {game?.alternate_venue_id && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold">Venue</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOverrides((s) => {
                            const next = { ...s };
                            delete next.venue_id;
                            return next;
                          })
                        }
                        className={cn(
                          "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition",
                          !overrides.venue_id || overrides.venue_id === game.venue_id
                            ? "border-[hsl(var(--scarlet))] bg-[hsl(var(--scarlet))]/20 text-[hsl(var(--scarlet))]"
                            : "border-white/10 bg-transparent hover:bg-white/5",
                        )}
                      >
                        {game.venue_name}
                        <span className="muted ml-1 text-xs">({game.venue_capacity.toLocaleString()} cap)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setOverrides((s) => ({
                            ...s,
                            venue_id: game.alternate_venue_id!,
                          }))
                        }
                        className={cn(
                          "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition",
                          overrides.venue_id === game.alternate_venue_id
                            ? "border-[hsl(var(--scarlet))] bg-[hsl(var(--scarlet))]/20 text-[hsl(var(--scarlet))]"
                            : "border-white/10 bg-transparent hover:bg-white/5",
                        )}
                      >
                        {game.alternate_venue_name ?? "Covelli"}
                        <span className="muted ml-1 text-xs">
                          ({(game.alternate_venue_capacity ?? 5800).toLocaleString()} cap)
                        </span>
                      </button>
                    </div>
                    <div className="muted text-xs">
                      Where to host? {game.venue_name} = more capacity;{" "}
                      {game.alternate_venue_name ?? "alternate venue"} = intimate sellout feel.
                    </div>
                  </div>
                )}
                <Control
                  label="Attendance"
                  value={overrides.attendance}
                  placeholder={game?.baseline_attendance}
                  min={attendanceMin}
                  max={attendanceMax}
                  step={sportScope.ranges.attendance.step}
                  format={(v) => (v ?? 0).toLocaleString()}
                  onChange={(v) => setOverrides((s) => ({ ...s, attendance: v }))}
                />
                {showStudentRatio && (
                  <Control
                    label="Student ratio"
                    value={
                      overrides.student_ratio != null ? Math.round(overrides.student_ratio * 1000) : undefined
                    }
                    placeholder={
                      game?.baseline_student_ratio != null ? Math.round(game.baseline_student_ratio * 1000) : undefined
                    }
                    min={sportScope.ranges.studentRatioPermille.min}
                    max={sportScope.ranges.studentRatioPermille.max}
                    step={sportScope.ranges.studentRatioPermille.step}
                    format={(v) => `${((v ?? 0) / 10).toFixed(1)}%`}
                    onChange={(v) => setOverrides((s) => ({ ...s, student_ratio: (v ?? 180) / 1000 }))}
                  />
                )}
                {!game?.is_indoor && (
                  <Control
                    label="Wind (mph)"
                    value={overrides.weather_wind_mph}
                    placeholder={game?.baseline_weather_wind_mph}
                    min={sportScope.ranges.windMph.min}
                    max={sportScope.ranges.windMph.max}
                    step={sportScope.ranges.windMph.step}
                    format={(v) => `${v ?? 0} mph`}
                    onChange={(v) => setOverrides((s) => ({ ...s, weather_wind_mph: v }))}
                  />
                )}
                <Control
                  label="Seats open %"
                  value={overrides.seats_open_pct}
                  placeholder={100}
                  min={sportScope.ranges.seatsOpenPct.min}
                  max={sportScope.ranges.seatsOpenPct.max}
                  step={sportScope.ranges.seatsOpenPct.step}
                  format={(v) => `${v ?? 100}%`}
                  onChange={(v) => setOverrides((s) => ({ ...s, seats_open_pct: v }))}
                />
                <div className="glass-strong rounded-2xl border border-white/10 p-3 text-xs">
                  <div className="font-semibold">Seats open (McMahon & Quintanar)</div>
                  <div className="muted mt-1">
                    Opening fewer seats raises effective fill → better HFA. This captures the &quot;open all seats at the
                    Schott/Covelli?&quot; decision and similar venue sizing tradeoffs.
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold">Promotion</div>
                  <select
                    value={overrides.promotion_type ?? game?.baseline_promotion_type ?? "none"}
                    onChange={(e) =>
                      setOverrides((s) => ({ ...s, promotion_type: e.target.value as PromotionType }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm glass-strong"
                    aria-label="Promotion type"
                  >
                    {promoOptions.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {tab === "atmosphere" && (
              <>
                <Control
                  label="Crowd energy"
                  value={overrides.crowd_energy}
                  placeholder={sportScope.defaults.crowdEnergy}
                  min={sportScope.ranges.crowdEnergy.min}
                  max={sportScope.ranges.crowdEnergy.max}
                  step={sportScope.ranges.crowdEnergy.step}
                  format={(v) => `${v ?? 0}/100`}
                  onChange={(v) => setOverrides((s) => ({ ...s, crowd_energy: v }))}
                />
                <div className="glass-strong rounded-2xl border border-white/10 p-4 text-xs">
                  <div className="font-semibold">{sportScope.label} crowd energy</div>
                  <div className="muted mt-1">
                    This lever increases projected decibels and adds a small, saturating boost to win probability.
                  </div>
                </div>
              </>
            )}

            {tab === "concessions" && (
              <>
                <Control
                  label="Stands open"
                  value={overrides.stands_open_pct}
                  placeholder={85}
                  min={sportScope.ranges.standsOpenPct.min}
                  max={sportScope.ranges.standsOpenPct.max}
                  step={sportScope.ranges.standsOpenPct.step}
                  format={(v) => `${v ?? 0}%`}
                  onChange={(v) => setOverrides((s) => ({ ...s, stands_open_pct: v }))}
                />
                <Control
                  label="Staff per stand"
                  value={overrides.staff_per_stand}
                  placeholder={6}
                  min={sportScope.ranges.staffPerStand.min}
                  max={sportScope.ranges.staffPerStand.max}
                  step={sportScope.ranges.staffPerStand.step}
                  format={(v) => `${v ?? 0}`}
                  onChange={(v) => setOverrides((s) => ({ ...s, staff_per_stand: v }))}
                />
                <Toggle
                  label="Express lanes"
                  checked={!!overrides.express_lanes}
                  onChange={(checked) => setOverrides((s) => ({ ...s, express_lanes: checked }))}
                />
                <Toggle
                  label="Early-arrival promo"
                  checked={!!overrides.early_arrival_promo}
                  onChange={(checked) => setOverrides((s) => ({ ...s, early_arrival_promo: checked }))}
                />
              </>
            )}

            {tab === "optimize" && (
              <>
                {game?.league_preset && (
                  <div className="glass-strong rounded-2xl border border-white/10 px-3 py-2 text-xs">
                    <div className="font-semibold">League context</div>
                    <div className="muted mt-0.5">
                      {game.league_preset === "college_football" && "Revenue sport • profit focus"}
                      {game.league_preset === "college_other" && "Non-revenue • mission + fan growth"}
                      {game.league_preset === "minor_league" && "Fan-base building • balance growth vs profit"}
                      {game.league_preset === "startup_league" && "New league • prioritize fan growth"}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-xs font-semibold">Objective mode</div>
                  <div className="flex gap-2">
                    {(["profit", "fan_growth", "mission"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setOptObjectiveMode(mode)}
                        className={cn(
                          "flex-1 rounded-xl px-3 py-2 text-center text-xs font-semibold transition",
                          optObjectiveMode === mode ? "btn-primary" : "btn-ghost",
                        )}
                        title={
                          mode === "profit"
                            ? "Maximize win prob + revenue"
                            : mode === "fan_growth"
                              ? showStudentRatio
                                ? "Prioritize attendance + student ratio"
                                : "Prioritize attendance + fan growth"
                              : showStudentRatio
                                ? "Prioritize student ratio + crowd energy (mission)"
                                : "Prioritize fan experience + crowd energy"
                        }
                      >
                        {mode === "profit" ? "Profit" : mode === "fan_growth" ? "Fan growth" : "Mission"}
                      </button>
                    ))}
                  </div>
                  <div className="muted text-[11px]">
                    {optObjectiveMode === "profit" && "Win prob + revenue (NFL/MLB execs)"}
                    {optObjectiveMode === "fan_growth" &&
                      (showStudentRatio
                        ? "Attendance + student mix (minor leagues)"
                        : "Attendance + fan growth (minor leagues)")}
                    {optObjectiveMode === "mission" &&
                      (showStudentRatio
                        ? "Student engagement + energy (university)"
                        : "Fan experience + energy (mission)")}
                  </div>
                </div>

                <Control
                  label="Target Δ win (pp)"
                  value={Math.round(optTarget * 10)}
                  placeholder={10}
                  min={0}
                  max={400}
                  step={1}
                  format={(v) => `${((v ?? 0) / 10).toFixed(1)} pp`}
                  onChange={(v) => setOptTarget((v ?? 10) / 10)}
                />

                <Control
                  label="Max attendance increase"
                  value={optMaxAtt}
                  placeholder={5000}
                  min={0}
                  max={15000}
                  step={500}
                  format={(v) => `+${(v ?? 0).toLocaleString()}`}
                  onChange={(v) => setOptMaxAtt(v ?? 0)}
                />

                {showStudentRatio && (
                  <Control
                    label="Max student ratio increase"
                    value={Math.round(optMaxSr * 1000)}
                    placeholder={30}
                    min={0}
                    max={120}
                    step={1}
                    format={(v) => `+${((v ?? 0) / 10).toFixed(1)}%`}
                    onChange={(v) => setOptMaxSr((v ?? 0) / 1000)}
                  />
                )}

                <Control
                  label="Max crowd energy increase"
                  value={optMaxEnergy}
                  placeholder={25}
                  min={0}
                  max={60}
                  step={5}
                  format={(v) => `+${v ?? 0}`}
                  onChange={(v) => setOptMaxEnergy(v ?? 0)}
                />

                <Control
                  label="Min stands open"
                  value={optMinStands}
                  placeholder={80}
                  min={50}
                  max={100}
                  step={5}
                  format={(v) => `${v ?? 0}%`}
                  onChange={(v) => setOptMinStands(v ?? 80)}
                />

                <Control
                  label="Max staff per stand"
                  value={optMaxStaff}
                  placeholder={12}
                  min={6}
                  max={20}
                  step={1}
                  format={(v) => `${v ?? 0}`}
                  onChange={(v) => setOptMaxStaff(v ?? 12)}
                />

                <GlassButton
                  variant="primary"
                  className="w-full"
                  onClick={() => optimizeMutation.mutate()}
                  disabled={optimizeMutation.isPending}
                >
                  {optimizeMutation.isPending ? "Optimizing…" : "Run optimizer"}
                </GlassButton>

                {optimizeMutation.data ? (
                  <OptimizeResultCard
                    data={optimizeMutation.data}
                    onApply={(o) => setOverrides((s) => ({ ...s, ...(o as any) }))}
                  />
                ) : null}

                {optimizeMutation.isError ? (
                  <div className="glass rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
                    <div className="font-semibold">Optimizer error</div>
                    <div className="muted mt-1">{String(optimizeMutation.error)}</div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </GlassCard>

        {/* Outputs */}
        <section className="lg:col-span-8 space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="relative rounded-2xl border border-white/[0.06] overflow-hidden p-4"
                  style={{ background: "linear-gradient(145deg, hsl(220 18% 7%), hsl(224 16% 10%))" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-white/10 via-white/5 to-transparent animate-pulse" />
                  <div className="h-2.5 w-20 rounded bg-white/[0.06] animate-pulse" />
                  <div className="mt-3 h-8 w-28 rounded-lg bg-white/[0.06] animate-pulse" />
                  <div className="mt-3 h-2.5 w-40 rounded bg-white/[0.04] animate-pulse" />
                  <div className="mt-4 pt-3 border-t border-white/[0.04]">
                    <div className="h-2.5 w-24 rounded bg-white/[0.04] animate-pulse" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Win probability"
              value={pct(cfWin)}
              accent="scarlet"
              sub={
                pctBand(
                  sim?.counterfactual.hfa.predicted_win_probability_ci_low,
                  sim?.counterfactual.hfa.predicted_win_probability_ci_high,
                ) ?? `${pct(baselineWin)} baseline \u2192 ${pct(cfWin)} counterfactual`
              }
              footer={
                <span className={cn("font-bold tabular-nums", deltaWin >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {deltaWin >= 0 ? "\u25B2 +" : "\u25BC "}
                  {(deltaWin * 100).toFixed(2)} pp
                </span>
              }
            />
            <KpiCard
              title="Loudness"
              value={`${(sim?.counterfactual.noise.projected_decibels ?? 0).toFixed(1)} dB`}
              accent={
                (sim?.counterfactual.noise.projected_decibels ?? 0) >= 110 ? "scarlet"
                  : (sim?.counterfactual.noise.projected_decibels ?? 0) >= 100 ? "positive"
                  : "default"
              }
              sub={
                dbBand(
                  sim?.counterfactual.noise.projected_decibels_ci_low,
                  sim?.counterfactual.noise.projected_decibels_ci_high,
                ) ?? `${(sim?.baseline.noise.projected_decibels ?? 0).toFixed(1)} dB baseline`
              }
              footer={
                (() => {
                  const dbDelta = (sim?.counterfactual.noise.projected_decibels ?? 0) - (sim?.baseline.noise.projected_decibels ?? 0);
                  return (
                    <span className={cn("font-bold tabular-nums", dbDelta >= 0 ? "text-emerald-400/70" : "text-rose-400/70")}>
                      {dbDelta >= 0 ? "+" : ""}{dbDelta.toFixed(1)} dB from baseline
                    </span>
                  );
                })()
              }
            />
            <KpiCard
              title="Concessions revenue"
              value={usd(sim?.counterfactual.concessions.revenue_total_usd ?? 0)}
              accent={
                ((sim?.counterfactual.concessions.revenue_total_usd ?? 0) - (sim?.baseline.concessions.revenue_total_usd ?? 0)) > 0
                  ? "positive" : "default"
              }
              sub={
                sim?.counterfactual.concessions.revenue_total_usd_ci_low != null &&
                sim?.counterfactual.concessions.revenue_total_usd_ci_high != null
                  ? `${usd(sim.counterfactual.concessions.revenue_total_usd_ci_low)}\u2013${usd(
                      sim.counterfactual.concessions.revenue_total_usd_ci_high,
                    )} (90% CI)`
                  : `${usd(sim?.baseline.concessions.revenue_total_usd ?? 0)} baseline`
              }
              footer={
                (() => {
                  const revDelta = (sim?.counterfactual.concessions.revenue_total_usd ?? 0) - (sim?.baseline.concessions.revenue_total_usd ?? 0);
                  return (
                    <span className={cn("font-bold tabular-nums", revDelta >= 0 ? "text-emerald-400/70" : "text-rose-400/70")}>
                      {revDelta >= 0 ? "+" : ""}{usd(revDelta)} delta
                    </span>
                  );
                })()
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <motion.div
              className="relative rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{
                background: "linear-gradient(145deg, hsl(220 18% 7%) 0%, hsl(224 16% 10%) 50%, hsl(220 14% 7%) 100%)",
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(354,78%,55%)] via-[hsl(354,78%,40%)]/50 to-transparent" />
              <div className="p-4">
                <GlassSectionTitle
                  title="Why win prob moved"
                  subtitle="Top feature contributions (percentage points)"
                />
                <div className="mt-3 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contribChart as any} layout="vertical" margin={{ left: 18, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        type="number"
                        domain={contribDomain}
                        tickFormatter={(v) => `${v.toFixed(1)}`}
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="lever"
                        width={110}
                        tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v: number) => [`${Number(v).toFixed(2)} pp`, "impact"]}
                        labelFormatter={(l) => `Lever: ${l}`}
                        contentStyle={{
                          background: "hsl(220 18% 10%)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="neg" fill="rgba(251,113,133,0.4)" radius={[4, 4, 4, 4]} />
                      <Bar dataKey="pos" fill="hsl(354 78% 55%)" radius={[4, 4, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="relative rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{
                background: "linear-gradient(145deg, hsl(220 18% 7%) 0%, hsl(224 16% 10%) 50%, hsl(220 14% 7%) 100%)",
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400/80 via-amber-500/30 to-transparent" />
              <div className="p-4">
                <GlassSectionTitle
                  title="Concessions wait time"
                  subtitle="Queue bands by period"
                  right={
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: (sim?.counterfactual.concessions.ops.worst_utilization ?? 0) > 0.9
                          ? "rgba(239,68,68,0.12)" : "rgba(52,211,153,0.1)",
                        color: (sim?.counterfactual.concessions.ops.worst_utilization ?? 0) > 0.9
                          ? "#ef4444" : "#34d399",
                        border: `1px solid ${(sim?.counterfactual.concessions.ops.worst_utilization ?? 0) > 0.9
                          ? "rgba(239,68,68,0.2)" : "rgba(52,211,153,0.2)"}`,
                      }}
                    >
                      {(((sim?.counterfactual.concessions.ops.worst_utilization ?? 0) as number) * 100).toFixed(0)}% peak
                    </span>
                  }
                />
                <div className="mt-3 space-y-2">
                  {(sim?.counterfactual.concessions.ops.wait_time_windows ?? []).map((w) => {
                    const utilColor = w.utilization > 1.0 ? "#ef4444" : w.utilization > 0.9 ? "#f59e0b" : w.utilization > 0.7 ? "#eab308" : "#22c55e";
                    return (
                      <div
                        key={w.window}
                        className="relative rounded-xl overflow-hidden px-3 py-2.5"
                        style={{ background: "rgba(255,255,255,0.03)" }}
                      >
                        {/* Fill bar behind content */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-xl"
                          style={{
                            width: `${Math.min(100, w.utilization * 100)}%`,
                            background: `linear-gradient(90deg, ${utilColor}12, ${utilColor}06)`,
                          }}
                        />
                        <div className="relative flex items-center justify-between text-sm">
                          <div className="font-semibold text-white/70">
                            {w.window === "pre_kick" ? "Pre-kick" : w.window === "halftime" ? "Halftime" : "Q4"}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-bold tabular-nums text-white/60">
                              {w.wait_minutes_band[0]}\u2013{w.wait_minutes_band[1]} min
                            </span>
                            <span className="font-bold tabular-nums" style={{ color: utilColor }}>
                              {(w.utilization * 100).toFixed(0)}%
                            </span>
                            {w.queue?.p_wait_gt_15 != null && w.queue.p_wait_gt_15 > 0.05 && (
                              <span className="text-[10px] text-rose-400/60">
                                SLA&gt;15m {(w.queue.p_wait_gt_15 * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div
                    className="rounded-xl px-3 py-3 text-xs"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="font-semibold text-white/60">Staffing recommendation</div>
                    <div className="mt-1 text-white/35">
                      Target \u226490% halftime util \u2192{" "}
                      <span className="font-bold text-emerald-400/70">
                        {sim?.counterfactual.concessions.ops.recommended_staff_per_stand ?? "\u2014"}
                      </span>{" "}
                      staff/stand
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Visual Modules Section */}
          <HudDivider className="opacity-40 my-6" />
          
          <div className="space-y-4">
            <GlassSectionTitle 
              title="Live Simulation Visuals" 
              subtitle="Real-time visualization of stadium operations and performance."
            />
            
            {/* Performance Gauges - Full Width */}
            {sim && (
              <PerformanceGauges
                winProbability={cfWin}
                winProbabilityBaseline={baselineWin}
                winProbabilityDelta={deltaWin}
                decibels={sim.counterfactual.noise.projected_decibels}
                decibelsBaseline={sim.baseline.noise.projected_decibels}
                crowdEnergy={overrides.crowd_energy ?? 78}
                opsUtilization={sim.counterfactual.concessions.ops.worst_utilization}
              />
            )}
            
            {/* Stadium and Concessions Side by Side */}
            <div className="grid gap-4 md:grid-cols-2">
              {game && (
                <StadiumFillViz
                  attendance={overrides.attendance ?? game.baseline_attendance}
                  capacity={effectiveVenueCapacity}
                  studentRatio={showStudentRatio ? (overrides.student_ratio ?? game.baseline_student_ratio) : 0}
                  showStudentSplit={showStudentRatio}
                  venueName={effectiveVenueName || game.venue_name}
                  sport={game.sport}
                />
              )}
              
              {sim && (
                <ConcessionStandsViz
                  standsOpen={sim.counterfactual.concessions.ops.stands_open}
                  standsTotal={sim.counterfactual.concessions.ops.stands_total}
                  staffPerStand={overrides.staff_per_stand ?? 6}
                  worstUtilization={sim.counterfactual.concessions.ops.worst_utilization}
                  waitWindows={sim.counterfactual.concessions.ops.wait_time_windows ?? []}
                  revenueTotal={sim.counterfactual.concessions.revenue_total_usd}
                  perCapSpend={sim.counterfactual.concessions.per_cap_spend_usd}
                  expressLanes={overrides.express_lanes}
                />
              )}
            </div>

            {/* AI Recommendations */}
            {game && sim && (
              <RecommendationsPanel
                currentOverrides={overrides}
                baselineAttendance={game.baseline_attendance}
                baselineStudentRatio={showStudentRatio ? game.baseline_student_ratio : undefined}
                currentWinProb={cfWin}
                baselineWinProb={baselineWin}
                opsUtilization={sim.counterfactual.concessions.ops.worst_utilization}
                crowdEnergy={overrides.crowd_energy ?? 78}
                decibels={sim.counterfactual.noise.projected_decibels}
                showStudentRatio={showStudentRatio}
                onApply={(newOverrides) => setOverrides((s) => ({ ...s, ...newOverrides }))}
              />
            )}
          </div>

          {simulateQuery.isError ? (
            <div className="glass rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
              <div className="font-semibold">API error</div>
              <div className="muted mt-1">{String(simulateQuery.error)}</div>
              <div className="muted mt-2 text-xs">
                Make sure the backend is running on <code>localhost:8000</code>.
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  footer,
  accent = "default",
}: {
  title: string;
  value: string;
  sub: string;
  footer: React.ReactNode;
  accent?: "default" | "positive" | "negative" | "scarlet";
}) {
  const accentStyles = {
    default: {
      border: "border-white/[0.08]",
      accentLine: "from-white/30 via-white/15 to-transparent",
      valueColor: "text-white/90",
      glow: "none",
    },
    positive: {
      border: "border-emerald-500/20",
      accentLine: "from-emerald-400 via-emerald-500/50 to-transparent",
      valueColor: "text-emerald-400",
      glow: "0 0 20px rgba(52,211,153,0.15)",
    },
    negative: {
      border: "border-rose-500/20",
      accentLine: "from-rose-400 via-rose-500/50 to-transparent",
      valueColor: "text-rose-400",
      glow: "0 0 20px rgba(251,113,133,0.15)",
    },
    scarlet: {
      border: "border-[hsl(354,78%,55%)]/20",
      accentLine: "from-[hsl(354,78%,55%)] via-[hsl(354,78%,40%)]/50 to-transparent",
      valueColor: "text-[hsl(354,78%,55%)]",
      glow: "0 0 20px hsl(354 78% 55% / 0.15)",
    },
  };

  const style = accentStyles[accent];

  return (
    <motion.div
      className={cn("relative rounded-2xl border overflow-hidden", style.border)}
      style={{
        background: "linear-gradient(145deg, hsl(220 18% 7%) 0%, hsl(224 16% 10%) 50%, hsl(220 14% 7%) 100%)",
        boxShadow: style.glow,
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2, boxShadow: `${style.glow}, 0 12px 30px rgba(0,0,0,0.4)` }}
    >
      {/* Top accent line */}
      <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", style.accentLine)} />

      <div className="p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold">{title}</div>
        <motion.div
          key={value}
          initial={{ opacity: 0.4, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={cn("mt-2 text-[28px] font-bold tabular-nums tracking-tight leading-none", style.valueColor)}
        >
          {value}
        </motion.div>
        <div className="mt-2 text-[11px] text-white/35 leading-relaxed">{sub}</div>
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <motion.div
            key={String(footer)}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="text-xs"
          >
            {footer}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function OptimizeResultCard({
  data,
  onApply,
}: {
  data: { recommended: { overrides: Record<string, unknown>; delta_win_probability: number; ops_worst_utilization: number; revenue_total_usd: number }; alternatives: Array<{ overrides: Record<string, unknown>; delta_win_probability: number; ops_worst_utilization: number; revenue_total_usd: number; score: number }> };
  onApply: (overrides: Record<string, unknown>) => void;
}) {
  const best = data.recommended;
  const utilOk = best.ops_worst_utilization <= 0.9;
  const winGood = best.delta_win_probability > 0;

  return (
    <motion.div
      className="relative rounded-2xl border overflow-hidden"
      style={{
        background: "linear-gradient(145deg, hsl(220 18% 7%) 0%, hsl(224 16% 10%) 50%, hsl(220 14% 7%) 100%)",
        borderColor: winGood ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)",
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Accent top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-emerald-500/50 to-transparent" />

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white/90">Recommended Bundle</div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">Optimizer result</div>
          </div>
          <GlassButton variant="primary" onClick={() => onApply(best.overrides)}>
            Apply
          </GlassButton>
        </div>

        {/* Result metrics */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl p-2.5" style={{ background: "rgba(52,211,153,0.08)" }}>
            <div className="text-[9px] text-emerald-400/50 uppercase tracking-widest font-semibold">Win delta</div>
            <div className="text-lg font-bold tabular-nums text-emerald-400 mt-0.5">
              +{(best.delta_win_probability * 100).toFixed(2)}pp
            </div>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: utilOk ? "rgba(52,211,153,0.06)" : "rgba(251,113,133,0.06)" }}>
            <div className={cn("text-[9px] uppercase tracking-widest font-semibold", utilOk ? "text-emerald-400/50" : "text-rose-400/50")}>Ops util</div>
            <div className={cn("text-lg font-bold tabular-nums mt-0.5", utilOk ? "text-emerald-400" : "text-rose-400")}>
              {(best.ops_worst_utilization * 100).toFixed(0)}%
            </div>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-[9px] text-white/30 uppercase tracking-widest font-semibold">Revenue</div>
            <div className="text-lg font-bold tabular-nums text-white/80 mt-0.5">
              {best.revenue_total_usd >= 1_000_000
                ? `$${(best.revenue_total_usd / 1_000_000).toFixed(2)}M`
                : `$${(best.revenue_total_usd / 1_000).toFixed(0)}K`}
            </div>
          </div>
        </div>

        {/* Override details */}
        <div className="mt-3 grid gap-1.5 md:grid-cols-2 text-xs">
          {Object.entries(best.overrides).map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between rounded-lg px-3 py-1.5"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div className="font-medium text-white/50">{k.replaceAll("_", " ")}</div>
              <div className="font-bold text-white/80 tabular-nums">{String(v)}</div>
            </div>
          ))}
        </div>

        {data.alternatives?.length ? (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="text-[9px] text-white/25 uppercase tracking-[0.2em] font-semibold mb-2">Alternatives</div>
            <div className="space-y-1.5">
              {data.alternatives.slice(0, 3).map((c, idx) => (
                <motion.button
                  key={idx}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs transition-all"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                  onClick={() => onApply(c.overrides)}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.07)" }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-white/60">Plan #{idx + 1}</div>
                    <div className="font-mono text-[10px] text-white/30">score {c.score.toFixed(2)}</div>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-white/40">
                    <span className="text-emerald-400/70 font-bold tabular-nums">
                      +{(c.delta_win_probability * 100).toFixed(2)}pp
                    </span>
                    <span className="tabular-nums">util {(c.ops_worst_utilization * 100).toFixed(0)}%</span>
                    <span className="tabular-nums">
                      {c.revenue_total_usd >= 1_000_000
                        ? `$${(c.revenue_total_usd / 1_000_000).toFixed(2)}M`
                        : `$${(c.revenue_total_usd / 1_000).toFixed(0)}K`}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
