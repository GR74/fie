"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { getGame, simulateGame } from "@/lib/api";
import { isProfessionalGame } from "@/lib/sports";
import { parseOverridesFromSearchParams } from "@/lib/scenarioUrl";
import { Chip, GlassCard, GlassSectionTitle } from "@/components/ui/glass";
import { useQuery } from "@tanstack/react-query";

function pct(x: number) {
  return `${(x * 100).toFixed(2)}%`;
}

export default function EnginePage() {
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="muted text-xs">
            <Link href={`/games/${gameId}`} className="hover:underline">
              {gameId}
            </Link>{" "}
            <span className="muted">/</span> <span className="font-medium">engine</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Engine <span className="scarlet">Explain</span>
          </h1>
          <p className="muted mt-1 text-sm">
            Transparent, live view of how inputs flow through the mock engines into outputs.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <GlassCard className="lg:col-span-4 p-4">
          <GlassSectionTitle title="Inputs" subtitle="This view reads overrides from the URL querystring." />
          <div className="muted mt-1 text-xs">
            Tip: go back to the simulator and hit Share to preserve a scenario.
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <KV label="Attendance" value={(overrides.attendance ?? g?.baseline_attendance ?? 0).toLocaleString()} />
            {showStudentRatio ? (
              <KV
                label="Student ratio"
                value={`${(((overrides.student_ratio ?? g?.baseline_student_ratio ?? 0) as number) * 100).toFixed(1)}%`}
              />
            ) : null}
            <KV label="Crowd energy" value={`${overrides.crowd_energy ?? 78}/100`} />
            <KV label="Promotion" value={overrides.promotion_type ?? g?.baseline_promotion_type ?? "none"} />
            <KV label="Stands open" value={`${overrides.stands_open_pct ?? 85}%`} />
            <KV label="Seats open" value={`${overrides.seats_open_pct ?? 100}%`} />
            <KV label="Staff/stand" value={`${overrides.staff_per_stand ?? 6}`} />
            <KV label="Express lanes" value={String(overrides.express_lanes ?? false)} />
            <KV label="Early-arrival promo" value={String(overrides.early_arrival_promo ?? false)} />
          </div>
        </GlassCard>

        <section className="lg:col-span-8 space-y-4">
          <GlassCard className="p-4">
            <GlassSectionTitle title="Outputs" subtitle="Baseline vs counterfactual from the combined /simulate engine." />
            <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
              <Output title="Win prob (baseline)" value={pct(sim?.baseline.hfa.predicted_win_probability ?? 0)} />
              <Output title="Win prob (counterfactual)" value={pct(sim?.counterfactual.hfa.predicted_win_probability ?? 0)} />
              <Output title="Δ win prob" value={`${((sim?.delta_win_probability ?? 0) * 100).toFixed(2)} pp`} />
              <Output title="Decibels (counterfactual)" value={`${(sim?.counterfactual.noise.projected_decibels ?? 0).toFixed(1)} dB`} />
              <Output title="Revenue (counterfactual)" value={(sim?.counterfactual.concessions.revenue_total_usd ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })} />
              <Output title="Worst utilization" value={`${(((sim?.counterfactual.concessions.ops.worst_utilization ?? 0) as number) * 100).toFixed(0)}%`} />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <GlassSectionTitle
              title="Engine model cards (from API)"
              subtitle={`Payload from /games/${gameId}/simulate → engine_assumptions`}
            />

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <ModelCard title="HFA Engine" body={(sim?.engine_assumptions as any)?.hfa_engine} />
              <ModelCard title="Noise Engine" body={(sim?.engine_assumptions as any)?.noise_engine} />
              <ModelCard title="Concessions Engine" body={(sim?.engine_assumptions as any)?.concessions_engine} />
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <GlassSectionTitle title="HFA breakdown" subtitle="Leave-one-out impacts in percentage points." />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {Object.entries(sim?.counterfactual.hfa.feature_contributions_pp ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/10">
                  <div className="font-semibold">{k.replaceAll("_", " ")}</div>
                  <div className="muted font-mono">{v.toFixed(2)} pp</div>
                </div>
              ))}
            </div>
          </GlassCard>

          {simQuery.isError ? (
            <div className="glass rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
              <div className="font-semibold">API error</div>
              <div className="muted mt-1">{String(simQuery.error)}</div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
      <div className="font-semibold">{label}</div>
      <div className="muted font-mono text-xs">{value}</div>
    </div>
  );
}

function Output({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass-strong rounded-xl border border-white/10 p-3">
      <div className="muted text-xs">{title}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function ModelCard({ title, body }: { title: string; body: any }) {
  return (
    <div className="glass-strong rounded-xl border border-white/10 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="muted mt-1 text-xs">{body?.description ?? "—"}</div>
      {Array.isArray(body?.notes) ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs muted">
          {body.notes.map((n: string) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      {Array.isArray(body?.bounds_db) ? (
        <div className="mt-3 text-xs muted">Bounds: {body.bounds_db[0]}–{body.bounds_db[1]} dB</div>
      ) : null}
    </div>
  );
}

