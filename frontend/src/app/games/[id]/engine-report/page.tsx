"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { getGame, simulateGame } from "@/lib/api";
import { isProfessionalGame } from "@/lib/sports";
import { parseOverridesFromSearchParams } from "@/lib/scenarioUrl";
import { Chip, GlassButton, GlassCard } from "@/components/ui/glass";
import { useQuery } from "@tanstack/react-query";

function pct(x: number) {
  return `${(x * 100).toFixed(2)}%`;
}

function usd(x: number) {
  return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function EngineReportPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const gameId = params.id;

  const overrides = useMemo(
    () => parseOverridesFromSearchParams(new URLSearchParams(searchParams?.toString())),
    [searchParams],
  );

  const gameQuery = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => getGame(gameId),
  });

  const simQuery = useQuery({
    queryKey: ["simulate", gameId, overrides],
    queryFn: () => simulateGame(gameId, overrides),
    enabled: !!gameId,
  });

  const g = gameQuery.data?.game;
  const sim = simQuery.data;
  const showStudentRatio = !isProfessionalGame(g);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="muted text-xs">
            <Link href={`/games/${gameId}`} className="hover:underline">
              {gameId}
            </Link>{" "}
            <span className="muted">/</span> <span className="font-medium">engine report</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Engine <span className="scarlet">Report</span>
          </h1>
          <p className="muted mt-1 text-sm">
            Print-friendly summary of your current scenario. Use your browser’s Print → Save as PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Print / Save PDF
        </button>
      </div>

      <GlassCard className="p-6 print:shadow-none print:bg-white print:text-black">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-lg font-semibold">
              {g ? (
                <>
                  {g.away_team} @ {g.home_team}
                </>
              ) : (
                "Loading…"
              )}
            </div>
            {g ? (
              <div className="muted mt-1 text-sm">
                {g.date} • {g.kickoff_time_local} • {g.venue_name} • Capacity{" "}
                {g.venue_capacity.toLocaleString()}
              </div>
            ) : null}
          </div>
          <div className="text-right">
            <div className="muted text-xs">Share link</div>
            <div className="mt-1 max-w-[28rem] truncate font-mono text-xs">
              {typeof window !== "undefined" ? window.location.href : ""}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <ReportKpi
            title="Win probability"
            value={pct(sim?.counterfactual.hfa.predicted_win_probability ?? 0)}
            note={`Δ ${(sim?.delta_win_probability ?? 0 * 100).toFixed(2)} pp`}
          />
          <ReportKpi
            title="Projected loudness"
            value={`${(sim?.counterfactual.noise.projected_decibels ?? 0).toFixed(1)} dB`}
            note="From energy + context"
          />
          <ReportKpi
            title="Concessions revenue"
            value={usd(sim?.counterfactual.concessions.revenue_total_usd ?? 0)}
            note={`Per-cap ${usd(sim?.counterfactual.concessions.per_cap_spend_usd ?? 0)}`}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="glass-strong rounded-2xl border border-white/10 p-4 print:border-black/10 print:bg-white">
            <div className="text-sm font-semibold">Scenario inputs</div>
            <div className="mt-3 grid gap-2 text-sm">
              <Row label="Attendance" value={(overrides.attendance ?? g?.baseline_attendance ?? 0).toLocaleString()} />
              {showStudentRatio ? (
                <Row
                  label="Student ratio"
                  value={`${(((overrides.student_ratio ?? g?.baseline_student_ratio ?? 0) as number) * 100).toFixed(1)}%`}
                />
              ) : null}
              <Row label="Crowd energy" value={`${overrides.crowd_energy ?? 78}/100`} />
              <Row label="Promotion" value={overrides.promotion_type ?? g?.baseline_promotion_type ?? "none"} />
              <Row label="Stands open" value={`${overrides.stands_open_pct ?? 85}%`} />
              <Row label="Staff/stand" value={`${overrides.staff_per_stand ?? 6}`} />
              <Row label="Express lanes" value={String(overrides.express_lanes ?? false)} />
              <Row label="Early-arrival promo" value={String(overrides.early_arrival_promo ?? false)} />
            </div>
          </div>

          <div className="glass-strong rounded-2xl border border-white/10 p-4 print:border-black/10 print:bg-white">
            <div className="text-sm font-semibold">Ops snapshot</div>
            <div className="muted mt-1 text-xs">Wait-time bands by window.</div>
            <div className="mt-3 space-y-2 text-sm">
              {(sim?.counterfactual.concessions.ops.wait_time_windows ?? []).map((w) => (
                <div key={w.window} className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 dark:bg-black/20 print:bg-white">
                  <div className="font-semibold">
                    {w.window === "pre_kick"
                      ? "Pre-kick"
                      : w.window === "halftime"
                        ? "Halftime"
                        : "Q4"}
                  </div>
                  <div className="muted">
                    {w.wait_minutes_band[0]}–{w.wait_minutes_band[1]} min
                    {w.queue?.p_wait_gt_15 != null ? (
                      <>
                        {" "}
                        • SLA&gt;15m {(w.queue.p_wait_gt_15 * 100).toFixed(0)}%
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
              <div className="mt-2 text-xs muted">
                Recommended staff/stand:{" "}
                <span className="font-semibold text-[hsl(var(--fg))]">
                  {sim?.counterfactual.concessions.ops.recommended_staff_per_stand ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/5 p-4 text-sm dark:bg-white/10 print:border-black/10 print:bg-white">
          <div className="text-sm font-semibold">Game-day runbook (mock)</div>
          <div className="muted mt-1 text-xs">
            Trigger-driven interventions based on utilization and SLA breach risk.
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 text-xs">
            <div className="rounded-xl bg-white/60 px-3 py-2 dark:bg-black/20 print:bg-white">
              <div className="font-semibold">Trigger</div>
              <div className="muted mt-1">Halftime SLA&gt;15m risk ≥ 20%</div>
              <div className="mt-2 font-semibold">Action</div>
              <div className="muted mt-1">
                Open +5% stands and deploy express lanes; target staff/stand per staffing plan.
              </div>
            </div>
            <div className="rounded-xl bg-white/60 px-3 py-2 dark:bg-black/20 print:bg-white">
              <div className="font-semibold">Trigger</div>
              <div className="muted mt-1">Worst utilization ≥ 100%</div>
              <div className="mt-2 font-semibold">Action</div>
              <div className="muted mt-1">
                Rebalance staffing to halftime window; prioritize high-throughput stands.
              </div>
            </div>
          </div>

          {sim?.counterfactual.concessions.ops.staffing_plan?.length ? (
            <div className="mt-4">
              <div className="muted text-[11px] uppercase tracking-[0.16em]">Staffing plan</div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {sim.counterfactual.concessions.ops.staffing_plan.map((s) => (
                  <div key={s.window} className="rounded-xl bg-white/60 px-3 py-2 dark:bg-black/20 print:bg-white">
                    <div className="font-semibold">
                      {s.window === "pre_kick" ? "Pre-kick" : s.window === "halftime" ? "Halftime" : "Q4"}
                    </div>
                    <div className="muted mt-1">
                      Staff/stand: <span className="font-semibold text-[hsl(var(--fg))]">{s.recommended_staff_per_stand}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/5 p-4 text-xs muted dark:bg-white/10 print:border-black/10 print:bg-white">
          Engine assumptions are mock and deterministic. The Engine page shows the model cards and breakdown used for this report.
        </div>
      </GlassCard>

      {simQuery.isError ? (
        <div className="glass rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
          <div className="font-semibold">API error</div>
          <div className="muted mt-1">{String(simQuery.error)}</div>
        </div>
      ) : null}
    </div>
  );
}

function ReportKpi({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="glass-strong rounded-2xl border border-white/10 p-4 print:border-black/10 print:bg-white">
      <div className="muted text-xs">{title}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="muted mt-1 text-xs">{note}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-3 py-2 dark:bg-black/20 print:bg-white">
      <div className="font-semibold">{label}</div>
      <div className="muted font-mono text-xs">{value}</div>
    </div>
  );
}

