"use client";

import { useMemo, useState, useEffect } from "react";

import { getRecommendations, predictHfa, type GlobalScenario, type PromotionType } from "@/lib/api";
import { Chip, GlassCard, GlassSectionTitle } from "@/components/ui/glass";
import { SportHeader } from "@/components/SportSwitcher";
import { buildScenarioDefaults, getSportScope, isProfessionalSportId } from "@/lib/sports";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

export default function ScenarioLabPage() {
  const searchParams = useSearchParams();
  const sport = getSportScope(searchParams?.get("sport"));
  const showStudentRatio = !isProfessionalSportId(sport.id);

  const [scenario, setScenario] = useState<GlobalScenario>(() => buildScenarioDefaults(sport));

  useEffect(() => {
    setScenario(buildScenarioDefaults(sport));
  }, [sport]);

  const scenarioKey = useMemo(() => scenario, [scenario]);

  const hfaQuery = useQuery({
    queryKey: ["global-hfa", scenarioKey],
    queryFn: () => predictHfa(scenarioKey),
  });

  const recsQuery = useQuery({
    queryKey: ["recs", scenarioKey],
    queryFn: () => getRecommendations(scenarioKey),
  });

  const promoOptions: Array<{ value: PromotionType; label: string }> = [
    { value: "none", label: "None" },
    { value: "student_push", label: "Student push" },
    { value: "alumni_night", label: "Alumni night" },
    { value: "family_bundle", label: "Family bundle" },
    { value: "rivalry_hype", label: "Rivalry hype" },
  ];

  return (
    <div className="space-y-8">
      <SportHeader
        title="Scenario Lab"
        subtitle="A general what-if playground using the same mock HFA engine (not game-specific)."
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <GlassCard className="lg:col-span-5 p-4 space-y-4">
          <GlassSectionTitle title="Inputs" subtitle="This is the global HFA engine (not tied to one game)." />

          <Control
            label="Attendance"
            value={scenario.attendance}
            min={sport.ranges.attendance.min}
            max={sport.ranges.attendance.max}
            step={sport.ranges.attendance.step}
            format={(v) => v.toLocaleString()}
            onChange={(v) => setScenario((s) => ({ ...s, attendance: v }))}
          />

          {showStudentRatio && (
            <Control
              label="Student ratio"
              value={Math.round(scenario.student_ratio * 1000)}
              min={sport.ranges.studentRatioPermille.min}
              max={sport.ranges.studentRatioPermille.max}
              step={sport.ranges.studentRatioPermille.step}
              format={(v) => `${(v / 10).toFixed(1)}%`}
              onChange={(v) => setScenario((s) => ({ ...s, student_ratio: v / 1000 }))}
            />
          )}

          <Control
            label="Opponent rank (1 best)"
            value={scenario.opponent_rank}
            min={1}
            max={25}
            step={1}
            format={(v) => `${v}`}
            onChange={(v) => setScenario((s) => ({ ...s, opponent_rank: v }))}
          />

          <Control
            label="Home rank (1 best)"
            value={scenario.home_rank}
            min={1}
            max={25}
            step={1}
            format={(v) => `${v}`}
            onChange={(v) => setScenario((s) => ({ ...s, home_rank: v }))}
          />

          <Control
            label="Wind (mph)"
            value={scenario.weather_wind}
            min={sport.ranges.windMph.min}
            max={sport.ranges.windMph.max}
            step={sport.ranges.windMph.step}
            format={(v) => `${v} mph`}
            onChange={(v) => setScenario((s) => ({ ...s, weather_wind: v }))}
          />

          <Control
            label="Crowd energy"
            value={scenario.crowd_energy}
            min={sport.ranges.crowdEnergy.min}
            max={sport.ranges.crowdEnergy.max}
            step={sport.ranges.crowdEnergy.step}
            format={(v) => `${v}/100`}
            onChange={(v) => setScenario((s) => ({ ...s, crowd_energy: v }))}
          />

          <div className="glass-strong flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
            <span className="font-semibold">Rival game</span>
            <input
              type="checkbox"
              checked={scenario.rival_game}
              onChange={(e) => setScenario((s) => ({ ...s, rival_game: e.target.checked }))}
              className="h-5 w-5 accent-[hsl(var(--scarlet))]"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold">Promotion</div>
            <select
              value={scenario.promotion}
              onChange={(e) => setScenario((s) => ({ ...s, promotion: e.target.value as PromotionType }))}
              className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm glass-strong"
            >
              {promoOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </GlassCard>

        <section className="lg:col-span-7 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <GlassCard className="p-4">
              <div className="muted text-xs">Predicted win probability</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight">
                {hfaQuery.data ? pct(hfaQuery.data.predicted_win_probability) : "—"}
              </div>
              <div className="muted mt-2 text-xs">
                Uses the global mock HFA endpoint (<code>/predict/hfa</code>).
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="muted text-xs">Top recommended levers</div>
              <div className="mt-2 space-y-2 text-sm">
                {(recsQuery.data?.recommendations ?? []).map((r) => (
                  <div key={r.lever} className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 dark:bg-white/10">
                    <div className="font-semibold">{r.lever}</div>
                    <div className="muted">
                      {r.change} → {r.delta_pp >= 0 ? "+" : ""}
                      {r.delta_pp.toFixed(2)} pp
                    </div>
                  </div>
                ))}
                {recsQuery.isLoading ? <div className="muted text-xs">Loading…</div> : null}
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-4">
            <GlassSectionTitle title="Explainability (logit terms)" subtitle="Helpful for the Engine tab/report." />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {Object.entries(hfaQuery.data?.terms_logit ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/10">
                  <div className="font-semibold">{k.replaceAll("_", " ")}</div>
                  <div className="muted font-mono">{v.toFixed(3)}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          {hfaQuery.isError ? (
            <div className="glass rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
              <div className="font-semibold">API error</div>
              <div className="muted mt-1">{String(hfaQuery.error)}</div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Control({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="font-semibold">{label}</div>
        <div className="muted font-mono">{format(value)}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range"
      />
    </div>
  );
}
