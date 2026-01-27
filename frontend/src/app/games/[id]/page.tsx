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
import type { GameSimulateResponse, PromotionType, SimulateOverrides } from "@/lib/api";
import { createScenario, getGame, optimizeGame, simulateGame } from "@/lib/api";
import { overridesToSearchParams, parseOverridesFromSearchParams } from "@/lib/scenarioUrl";
import { Chip, GlassButton, GlassCard, GlassSectionTitle } from "@/components/ui/glass";
import { HudDivider, StatBar } from "@/components/ui/hud";
import { useTelemetry } from "@/components/cinematic/Telemetry";
import { StadiumFillViz } from "@/components/viz/StadiumFillViz";
import { ConcessionStandsViz } from "@/components/viz/ConcessionStandsViz";
import { PerformanceGauges } from "@/components/viz/PerformanceGauges";
import { PresetSelector, PresetButtons } from "@/components/PresetSelector";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
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

  const [optimizing, setOptimizing] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);

  const gameQuery = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => getGame(gameId),
  });

  const simulateQuery = useQuery({
    queryKey: ["simulate", gameId, stableOverrides],
    queryFn: () => simulateGame(gameId, stableOverrides),
    enabled: !!gameId,
  });

  const optimizeMutation = useMutation({
    mutationFn: () =>
      optimizeGame(gameId, {
        current_overrides: stableOverrides,
        target_delta_win_pp: optTarget,
        max_attendance_increase: optMaxAtt,
        max_student_ratio_increase: optMaxSr,
        max_crowd_energy_increase: optMaxEnergy,
        max_staff_per_stand: optMaxStaff,
        min_stands_open_pct: optMinStands,
      }),
  });

  // Gentle initial defaults once game loads.
  useEffect(() => {
    const g = gameQuery.data?.game;
    if (!g) return;
    setOverrides((prev) => ({
      ...prev,
      crowd_energy: prev.crowd_energy ?? 78,
      stands_open_pct: prev.stands_open_pct ?? 85,
      staff_per_stand: prev.staff_per_stand ?? 6,
    }));
  }, [gameQuery.data?.game]);

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

  const game = gameQuery.data?.game;
  const sim = simulateQuery.data;

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
  const fillPct = game
    ? ((overrides.attendance ?? game.baseline_attendance) / game.venue_capacity) * 100
    : 0;

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
                  {game.venue_name} • cap {game.venue_capacity.toLocaleString()}
                </Chip>
              </div>
            ) : null}
            <p className="muted max-w-2xl text-sm">
              A high-fidelity, Ohio State–inspired simulator: crowd composition, loudness, and concessions ops all roll up
              into a single game-day decision surface.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PresetSelector 
            onApply={(preset) => setOverrides((s) => ({ ...s, ...preset }))}
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
                ["student_ratio_baseline", game.baseline_student_ratio],
                ["student_ratio_counterfactual", overrides.student_ratio ?? game.baseline_student_ratio],
                ["crowd_energy", overrides.crowd_energy ?? 78],
                ["win_prob_baseline", sim.baseline.hfa.predicted_win_probability],
                ["win_prob_counterfactual", sim.counterfactual.hfa.predicted_win_probability],
                ["delta_win_prob", sim.delta_win_probability],
                ["decibels_baseline", sim.baseline.noise.projected_decibels],
                ["decibels_counterfactual", sim.counterfactual.noise.projected_decibels],
                ["revenue_baseline_usd", sim.baseline.concessions.revenue_total_usd],
                ["revenue_counterfactual_usd", sim.counterfactual.concessions.revenue_total_usd],
              ];
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
          label="Stadium_fill"
          value={`${fillPct.toFixed(1)}%`}
          sub="Attendance vs capacity"
          tone="neutral"
        />
        <StatBar
          label="Crowd_energy"
          value={`${overrides.crowd_energy ?? 78}/100`}
          sub="Controls decibels + small HFA bump"
          tone="scarlet"
        />
        <StatBar
          label="Ops_pressure"
          value={`${(((sim?.counterfactual.concessions.ops.worst_utilization ?? 0) as number) * 100).toFixed(0)}%`}
          sub="Worst concessions utilization"
          tone={
            (sim?.counterfactual.concessions.ops.worst_utilization ?? 0) > 1.0
              ? "bad"
              : (sim?.counterfactual.concessions.ops.worst_utilization ?? 0) > 0.9
                ? "neutral"
                : "good"
          }
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
                        max_student_ratio_increase: 0.03,
                        max_crowd_energy_increase: 25,
                        max_staff_per_stand: 10,
                        min_stands_open_pct: 80,
                        target_delta_win_pp: 1.0,
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

          <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
              {(
                [
                  ["competitive", "Competitive"],
                  ["atmosphere", "Atmosphere"],
                  ["concessions", "Concessions"],
                  ["optimize", "Optimize"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-center font-semibold transition",
                    tab === k
                      ? "btn-primary"
                      : "btn-ghost",
                  )}
                >
                  {label}
                </button>
              ))}
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
              className="pb-2 border-b border-white/10"
            />
            
            {tab === "competitive" && (
              <>
                <Control
                  label="Attendance"
                  value={overrides.attendance}
                  placeholder={game?.baseline_attendance}
                  min={80000}
                  max={game?.venue_capacity ?? 110000}
                  step={250}
                  format={(v) => (v ?? 0).toLocaleString()}
                  onChange={(v) => setOverrides((s) => ({ ...s, attendance: v }))}
                />
                <Control
                  label="Student ratio"
                  value={
                    overrides.student_ratio != null ? Math.round(overrides.student_ratio * 1000) : undefined
                  }
                  placeholder={
                    game?.baseline_student_ratio != null ? Math.round(game.baseline_student_ratio * 1000) : undefined
                  }
                  min={100}
                  max={260}
                  step={1}
                  format={(v) => `${((v ?? 0) / 10).toFixed(1)}%`}
                  onChange={(v) => setOverrides((s) => ({ ...s, student_ratio: (v ?? 180) / 1000 }))}
                />
                <Control
                  label="Wind (mph)"
                  value={overrides.weather_wind_mph}
                  placeholder={game?.baseline_weather_wind_mph}
                  min={0}
                  max={25}
                  step={1}
                  format={(v) => `${v ?? 0} mph`}
                  onChange={(v) => setOverrides((s) => ({ ...s, weather_wind_mph: v }))}
                />
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
                  placeholder={78}
                  min={0}
                  max={100}
                  step={1}
                  format={(v) => `${v ?? 0}/100`}
                  onChange={(v) => setOverrides((s) => ({ ...s, crowd_energy: v }))}
                />
                <div className="glass-strong rounded-2xl border border-white/10 p-4 text-xs">
                  <div className="font-semibold">Buckeye crowd energy</div>
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
                  min={50}
                  max={100}
                  step={1}
                  format={(v) => `${v ?? 0}%`}
                  onChange={(v) => setOverrides((s) => ({ ...s, stands_open_pct: v }))}
                />
                <Control
                  label="Staff per stand"
                  value={overrides.staff_per_stand}
                  placeholder={6}
                  min={2}
                  max={12}
                  step={1}
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
                <div className="glass-strong rounded-2xl border border-white/10 p-4 text-xs">
                  <div className="font-semibold">Optimizer mode</div>
                  <div className="muted mt-1">
                    Finds a lever bundle that maximizes Δ win prob while penalizing concessions overload.
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
                <GlassCard key={i} className="p-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                  <div className="mt-3 h-8 w-32 animate-pulse rounded bg-white/10" />
                  <div className="mt-3 h-3 w-48 animate-pulse rounded bg-white/10" />
                </GlassCard>
              ))}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Win probability"
              value={pct(cfWin)}
              sub={
                pctBand(
                  sim?.counterfactual.hfa.predicted_win_probability_ci_low,
                  sim?.counterfactual.hfa.predicted_win_probability_ci_high,
                ) ?? `${pct(baselineWin)} baseline → ${pct(cfWin)} counterfactual`
              }
              footer={
                <span className={cn("font-semibold", deltaWin >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {deltaWin >= 0 ? "+" : ""}
                  {(deltaWin * 100).toFixed(2)} pp
                </span>
              }
            />
            <KpiCard
              title="Loudness"
              value={`${(sim?.counterfactual.noise.projected_decibels ?? 0).toFixed(1)} dB`}
              sub={
                dbBand(
                  sim?.counterfactual.noise.projected_decibels_ci_low,
                  sim?.counterfactual.noise.projected_decibels_ci_high,
                ) ?? `${(sim?.baseline.noise.projected_decibels ?? 0).toFixed(1)} baseline`
              }
              footer={
                <span className="muted">
                  {(
                    (sim?.counterfactual.noise.projected_decibels ?? 0) -
                    (sim?.baseline.noise.projected_decibels ?? 0)
                  ).toFixed(1)}{" "}
                  dB change
                </span>
              }
            />
            <KpiCard
              title="Concessions revenue"
              value={usd(sim?.counterfactual.concessions.revenue_total_usd ?? 0)}
              sub={
                sim?.counterfactual.concessions.revenue_total_usd_ci_low != null &&
                sim?.counterfactual.concessions.revenue_total_usd_ci_high != null
                  ? `${usd(sim.counterfactual.concessions.revenue_total_usd_ci_low)}–${usd(
                      sim.counterfactual.concessions.revenue_total_usd_ci_high,
                    )} (90%)`
                  : `${usd(sim?.baseline.concessions.revenue_total_usd ?? 0)} baseline`
              }
              footer={
                <span className="muted">
                  {usd(
                    (sim?.counterfactual.concessions.revenue_total_usd ?? 0) -
                      (sim?.baseline.concessions.revenue_total_usd ?? 0),
                  )}{" "}
                  delta
                </span>
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <GlassCard className="p-4">
              <GlassSectionTitle
                title="Why win prob moved"
                subtitle="Top feature contributions (percentage points)."
              />
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contribChart as any} layout="vertical" margin={{ left: 18, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis
                      type="number"
                      domain={contribDomain}
                      tickFormatter={(v) => `${v.toFixed(1)}`}
                    />
                    <YAxis type="category" dataKey="lever" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(v: number) => [`${Number(v).toFixed(2)} pp`, "impact"]}
                      labelFormatter={(l) => `Lever: ${l}`}
                    />
                    <Bar dataKey="neg" fill="rgba(255,255,255,0.22)" radius={[6, 6, 6, 6]} />
                    <Bar dataKey="pos" fill="hsl(var(--scarlet))" radius={[6, 6, 6, 6]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <GlassSectionTitle
                title="Concessions wait time"
                subtitle="Bands by window + utilization."
                right={
                  <span className="chip rounded-full px-3 py-1 text-[11px] font-semibold muted">
                    worst util{" "}
                    {(((sim?.counterfactual.concessions.ops.worst_utilization ?? 0) as number) * 100).toFixed(0)}%
                  </span>
                }
              />
              <div className="mt-3 space-y-2 text-sm">
                {(sim?.counterfactual.concessions.ops.wait_time_windows ?? []).map((w) => (
                  <div key={w.window} className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 dark:bg-white/10">
                    <div className="font-semibold">
                      {w.window === "pre_kick"
                        ? "Pre-kick"
                        : w.window === "halftime"
                          ? "Halftime"
                          : "Q4"}
                    </div>
                    <div className="muted">
                      {w.wait_minutes_band[0]}–{w.wait_minutes_band[1]} min{" "}
                      <ArrowRight className="inline h-4 w-4 align-[-2px]" /> util{" "}
                      {(w.utilization * 100).toFixed(0)}%
                      {w.queue?.p_wait_gt_15 != null ? (
                        <>
                          {" "}
                          • SLA&gt;15m {(w.queue.p_wait_gt_15 * 100).toFixed(0)}%
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-white/10 bg-black/5 p-4 text-xs dark:bg-white/10">
                  <div className="font-semibold">Staffing recommendation</div>
                  <div className="muted mt-1">
                    Targeting ≤90% halftime utilization suggests{" "}
                    <span className="font-semibold">
                      {sim?.counterfactual.concessions.ops.recommended_staff_per_stand ?? "—"}
                    </span>{" "}
                    staff per stand.
                  </div>
                </div>
              </div>
            </GlassCard>
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
                  capacity={game.venue_capacity}
                  studentRatio={overrides.student_ratio ?? game.baseline_student_ratio}
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
                baselineStudentRatio={game.baseline_student_ratio}
                currentWinProb={cfWin}
                baselineWinProb={baselineWin}
                opsUtilization={sim.counterfactual.concessions.ops.worst_utilization}
                crowdEnergy={overrides.crowd_energy ?? 78}
                decibels={sim.counterfactual.noise.projected_decibels}
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
}: {
  title: string;
  value: string;
  sub: string;
  footer: React.ReactNode;
}) {
  return (
    <GlassCard className="p-4">
      <div className="muted text-xs">{title}</div>
      <motion.div 
        key={value}
        initial={{ opacity: 0.5, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-1 text-2xl font-semibold tracking-tight"
      >
        {value}
      </motion.div>
      <div className="muted mt-1 text-xs">{sub}</div>
      <motion.div 
        key={String(footer)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="mt-3 text-xs"
      >
        {footer}
      </motion.div>
    </GlassCard>
  );
}

function Control({
  label,
  value,
  placeholder,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number | undefined;
  placeholder: number | undefined;
  min: number;
  max: number;
  step: number;
  format: (v: number | undefined) => string;
  onChange: (v: number) => void;
}) {
  const v = value ?? placeholder ?? min;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="font-semibold">{label}</div>
        <div className="muted font-mono">{format(value ?? placeholder)}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="glass-strong flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm">
      <span className="font-semibold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[hsl(var(--scarlet))]"
      />
    </label>
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
  return (
    <div className="glass-strong rounded-2xl border border-white/10 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">Recommended bundle</div>
        <GlassButton variant="primary" onClick={() => onApply(best.overrides)}>
          Apply
        </GlassButton>
      </div>
      <div className="muted mt-1 text-xs">
        Δ win {(best.delta_win_probability * 100).toFixed(2)}pp • ops util{" "}
        {(best.ops_worst_utilization * 100).toFixed(0)}% • revenue{" "}
        {best.revenue_total_usd.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 text-xs">
        {Object.entries(best.overrides).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 dark:bg-white/10">
            <div className="font-semibold">{k.replaceAll("_", " ")}</div>
            <div className="muted font-mono">{String(v)}</div>
          </div>
        ))}
      </div>

      {data.alternatives?.length ? (
        <div className="mt-4">
          <div className="muted text-[11px] uppercase tracking-[0.16em]">Alternatives</div>
          <div className="mt-2 space-y-2">
            {data.alternatives.slice(0, 3).map((c, idx) => (
              <button
                key={idx}
                className="w-full rounded-xl bg-black/5 px-3 py-2 text-left text-xs transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                onClick={() => onApply(c.overrides)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Alt #{idx + 1}</div>
                  <div className="muted font-mono">{c.score.toFixed(2)}</div>
                </div>
                <div className="muted mt-1">
                  Δ {(c.delta_win_probability * 100).toFixed(2)}pp • util {(c.ops_worst_utilization * 100).toFixed(0)}% •{" "}
                  {c.revenue_total_usd.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}


