"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Plus, X, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { GlassCard, GlassSectionTitle, Chip, GlassButton } from "@/components/ui/glass";
import { HudDivider } from "@/components/ui/hud";
import { simulateGame, getGame } from "@/lib/api";
import type { SimulateOverrides } from "@/lib/api";

interface ScenarioSlot {
  id: string;
  name: string;
  overrides: SimulateOverrides;
  color: string;
}

const SLOT_COLORS = ["#bb0000", "#22c55e", "#f59e0b", "#3b82f6"];
const SLOT_NAMES = ["Scenario A", "Scenario B", "Scenario C", "Scenario D"];

const PRESET_SCENARIOS: ScenarioSlot[] = [
  {
    id: "baseline",
    name: "Baseline",
    overrides: { crowd_energy: 78 },
    color: "#6b7280",
  },
  {
    id: "max_atmosphere",
    name: "Max Atmosphere",
    overrides: { attendance: 102780, student_ratio: 0.26, crowd_energy: 95, stands_open_pct: 100, staff_per_stand: 8 },
    color: "#bb0000",
  },
  {
    id: "revenue_focus",
    name: "Revenue Focus",
    overrides: { attendance: 98000, student_ratio: 0.18, crowd_energy: 70, stands_open_pct: 95, staff_per_stand: 10 },
    color: "#22c55e",
  },
  {
    id: "conservative",
    name: "Conservative",
    overrides: { attendance: 95000, student_ratio: 0.20, crowd_energy: 65, stands_open_pct: 100, staff_per_stand: 10 },
    color: "#6b7280",
  },
];

function MetricCompare({
  label,
  values,
  colors,
  format,
  higherBetter = true,
}: {
  label: string;
  values: (number | null)[];
  colors: string[];
  format: (v: number) => string;
  higherBetter?: boolean;
}) {
  const validValues = values.filter((v): v is number => v != null);
  const max = Math.max(...validValues);
  const min = Math.min(...validValues);
  const best = higherBetter ? max : min;

  return (
    <div className="py-3 border-b border-white/5 last:border-0">
      <div className="text-xs text-white/50 mb-2">{label}</div>
      <div className="grid grid-cols-4 gap-2">
        {values.map((v, i) => {
          const isBest = v === best && validValues.length > 1;
          return (
            <div key={i} className="text-center">
              {v != null ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`text-lg font-bold ${isBest ? "ring-2 ring-offset-2 ring-offset-black/50 rounded-lg p-1" : ""}`}
                  style={{ 
                    color: colors[i],
                    ringColor: isBest ? colors[i] : "transparent",
                  }}
                >
                  {format(v)}
                  {isBest && <span className="ml-1 text-xs">★</span>}
                </motion.div>
              ) : (
                <div className="text-lg text-white/20">—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeltaIndicator({ value, baseline }: { value: number; baseline: number }) {
  const delta = value - baseline;
  const pctChange = baseline !== 0 ? (delta / baseline) * 100 : 0;
  
  if (Math.abs(delta) < 0.001) {
    return <Minus className="w-3 h-3 text-white/30" />;
  }
  
  return delta > 0 ? (
    <div className="flex items-center gap-0.5 text-emerald-400 text-[10px]">
      <TrendingUp className="w-3 h-3" />
      +{pctChange.toFixed(1)}%
    </div>
  ) : (
    <div className="flex items-center gap-0.5 text-rose-400 text-[10px]">
      <TrendingDown className="w-3 h-3" />
      {pctChange.toFixed(1)}%
    </div>
  );
}

export default function ComparePage() {
  const gameId = "michigan_at_osu_2026"; // Default game
  const [slots, setSlots] = useState<(ScenarioSlot | null)[]>([
    PRESET_SCENARIOS[0], // Baseline
    PRESET_SCENARIOS[1], // Max Atmosphere
    null,
    null,
  ]);

  const gameQuery = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => getGame(gameId),
  });

  // Simulate all active scenarios
  const simulationQueries = slots.map((slot, index) => 
    useQuery({
      queryKey: ["compare-sim", gameId, slot?.id, JSON.stringify(slot?.overrides)],
      queryFn: () => slot ? simulateGame(gameId, slot.overrides) : null,
      enabled: !!slot,
    })
  );

  const game = gameQuery.data?.game;
  const results = simulationQueries.map((q) => q.data);
  const isLoading = simulationQueries.some((q) => q.isLoading);

  const activeSlots = slots.filter((s): s is ScenarioSlot => s != null);
  const activeColors = slots.map((s, i) => s ? s.color : SLOT_COLORS[i]);

  const addScenario = (scenario: ScenarioSlot) => {
    const emptyIndex = slots.findIndex((s) => s == null);
    if (emptyIndex !== -1) {
      const newSlots = [...slots];
      newSlots[emptyIndex] = { ...scenario, color: SLOT_COLORS[emptyIndex] };
      setSlots(newSlots);
    }
  };

  const removeScenario = (index: number) => {
    const newSlots = [...slots];
    newSlots[index] = null;
    setSlots(newSlots);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="muted text-xs mb-2">
            <Link href="/games" className="hover:underline">Games</Link>
            {" / "}
            <Link href={`/games/${gameId}`} className="hover:underline">{gameId}</Link>
            {" / "}
            <span className="font-medium">Compare</span>
          </div>
          <h1 className="display text-4xl font-semibold tracking-tight">
            Scenario <span className="text-[hsl(var(--scarlet))]">Comparison</span>
          </h1>
          <p className="muted mt-1 text-sm max-w-xl">
            Compare up to 4 scenarios side-by-side. See which combination of levers produces the best outcomes.
          </p>
        </div>
        <Link href={`/games/${gameId}`}>
          <GlassButton>
            <ArrowRight className="w-4 h-4" /> Back to Simulator
          </GlassButton>
        </Link>
      </div>

      {/* Scenario Slots */}
      <div className="grid grid-cols-4 gap-4">
        {slots.map((slot, index) => (
          <motion.div
            key={index}
            layout
            className="relative"
          >
            {slot ? (
              <GlassCard 
                className="p-4 h-full"
                style={{ borderColor: `${slot.color}40` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div 
                      className="text-sm font-bold"
                      style={{ color: slot.color }}
                    >
                      {slot.name}
                    </div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                      {SLOT_NAMES[index]}
                    </div>
                  </div>
                  <button
                    onClick={() => removeScenario(index)}
                    className="p-1 rounded-lg hover:bg-white/10 transition"
                  >
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                </div>
                
                {/* Scenario overrides */}
                <div className="space-y-1 text-[10px]">
                  {slot.overrides.attendance && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Attendance</span>
                      <span className="font-mono">{slot.overrides.attendance.toLocaleString()}</span>
                    </div>
                  )}
                  {slot.overrides.student_ratio && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Student %</span>
                      <span className="font-mono">{(slot.overrides.student_ratio * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  {slot.overrides.crowd_energy && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Energy</span>
                      <span className="font-mono">{slot.overrides.crowd_energy}</span>
                    </div>
                  )}
                  {slot.overrides.staff_per_stand && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Staff/Stand</span>
                      <span className="font-mono">{slot.overrides.staff_per_stand}</span>
                    </div>
                  )}
                </div>
              </GlassCard>
            ) : (
              <button
                onClick={() => {
                  // Show preset selector or use next preset
                  const usedIds = slots.filter(Boolean).map((s) => s!.id);
                  const nextPreset = PRESET_SCENARIOS.find((p) => !usedIds.includes(p.id));
                  if (nextPreset) {
                    addScenario(nextPreset);
                  }
                }}
                className="w-full h-full min-h-[140px] rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 transition flex flex-col items-center justify-center gap-2"
              >
                <Plus className="w-6 h-6 text-white/30" />
                <span className="text-xs text-white/40">Add Scenario</span>
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Quick Add Presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-white/40 py-1">Quick add:</span>
        {PRESET_SCENARIOS.map((preset) => {
          const isUsed = slots.some((s) => s?.id === preset.id);
          const canAdd = slots.some((s) => s == null);
          return (
            <button
              key={preset.id}
              onClick={() => !isUsed && canAdd && addScenario(preset)}
              disabled={isUsed || !canAdd}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                isUsed 
                  ? "bg-white/5 text-white/30 cursor-not-allowed" 
                  : "bg-white/10 hover:bg-white/15 text-white/70"
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>

      <HudDivider className="opacity-40" />

      {/* Comparison Results */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Win Probability */}
        <GlassCard className="p-4">
          <GlassSectionTitle 
            title="Win Probability" 
            subtitle="Home field advantage contribution"
          />
          <div className="mt-4">
            <MetricCompare
              label="Win Probability"
              values={results.map((r) => r?.counterfactual.hfa.predicted_win_probability ?? null)}
              colors={activeColors}
              format={(v) => `${(v * 100).toFixed(1)}%`}
              higherBetter={true}
            />
            <MetricCompare
              label="Delta from Baseline"
              values={results.map((r) => r?.delta_win_probability ?? null)}
              colors={activeColors}
              format={(v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}pp`}
              higherBetter={true}
            />
          </div>
        </GlassCard>

        {/* Atmosphere */}
        <GlassCard className="p-4">
          <GlassSectionTitle 
            title="Atmosphere" 
            subtitle="Loudness and crowd energy"
          />
          <div className="mt-4">
            <MetricCompare
              label="Projected Decibels"
              values={results.map((r) => r?.counterfactual.noise.projected_decibels ?? null)}
              colors={activeColors}
              format={(v) => `${v.toFixed(1)} dB`}
              higherBetter={true}
            />
            <MetricCompare
              label="Energy Score"
              values={results.map((r) => r?.counterfactual.noise.energy_score ?? null)}
              colors={activeColors}
              format={(v) => `${v}/100`}
              higherBetter={true}
            />
          </div>
        </GlassCard>

        {/* Revenue */}
        <GlassCard className="p-4">
          <GlassSectionTitle 
            title="Concessions Revenue" 
            subtitle="Total and per-capita spending"
          />
          <div className="mt-4">
            <MetricCompare
              label="Total Revenue"
              values={results.map((r) => r?.counterfactual.concessions.revenue_total_usd ?? null)}
              colors={activeColors}
              format={(v) => `$${(v / 1000000).toFixed(2)}M`}
              higherBetter={true}
            />
            <MetricCompare
              label="Per-Cap Spend"
              values={results.map((r) => r?.counterfactual.concessions.per_cap_spend_usd ?? null)}
              colors={activeColors}
              format={(v) => `$${v.toFixed(2)}`}
              higherBetter={true}
            />
            <MetricCompare
              label="Gross Margin"
              values={results.map((r) => r?.counterfactual.concessions.gross_margin_usd ?? null)}
              colors={activeColors}
              format={(v) => `$${(v / 1000).toFixed(0)}K`}
              higherBetter={true}
            />
          </div>
        </GlassCard>

        {/* Operations */}
        <GlassCard className="p-4">
          <GlassSectionTitle 
            title="Operations" 
            subtitle="Concessions utilization and wait times"
          />
          <div className="mt-4">
            <MetricCompare
              label="Worst Utilization"
              values={results.map((r) => r?.counterfactual.concessions.ops.worst_utilization ?? null)}
              colors={activeColors}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              higherBetter={false}
            />
            <MetricCompare
              label="Recommended Staff"
              values={results.map((r) => r?.counterfactual.concessions.ops.recommended_staff_per_stand ?? null)}
              colors={activeColors}
              format={(v) => `${v} per stand`}
              higherBetter={false}
            />
          </div>
        </GlassCard>
      </div>

      {/* Summary Table */}
      <GlassCard className="p-4">
        <GlassSectionTitle 
          title="Summary Comparison" 
          subtitle="All key metrics at a glance"
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-white/50 font-normal">Metric</th>
                {slots.map((slot, i) => (
                  <th 
                    key={i} 
                    className="text-center py-2 px-3 font-semibold"
                    style={{ color: slot?.color || "#666" }}
                  >
                    {slot?.name || "—"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-2 px-3 text-white/70">Win Probability</td>
                {results.map((r, i) => (
                  <td key={i} className="text-center py-2 px-3 font-mono">
                    {r ? `${(r.counterfactual.hfa.predicted_win_probability * 100).toFixed(1)}%` : "—"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-3 text-white/70">Loudness (dB)</td>
                {results.map((r, i) => (
                  <td key={i} className="text-center py-2 px-3 font-mono">
                    {r ? r.counterfactual.noise.projected_decibels.toFixed(1) : "—"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-3 text-white/70">Revenue</td>
                {results.map((r, i) => (
                  <td key={i} className="text-center py-2 px-3 font-mono">
                    {r ? `$${(r.counterfactual.concessions.revenue_total_usd / 1000000).toFixed(2)}M` : "—"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-3 text-white/70">Ops Utilization</td>
                {results.map((r, i) => (
                  <td key={i} className="text-center py-2 px-3 font-mono">
                    {r ? `${(r.counterfactual.concessions.ops.worst_utilization * 100).toFixed(0)}%` : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {isLoading && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-xl bg-black/80 text-white text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Simulating...
        </div>
      )}
    </div>
  );
}

