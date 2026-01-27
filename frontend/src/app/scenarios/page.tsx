"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Chip, GlassButton, GlassCard, GlassSectionTitle } from "@/components/ui/glass";
import { deleteScenario, listScenarios } from "@/lib/api";
import { overridesToSearchParams } from "@/lib/scenarioUrl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function ScenariosPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["scenarios"],
    queryFn: () => listScenarios(),
  });

  const del = useMutation({
    mutationFn: (scenarioId: string) => deleteScenario(scenarioId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scenarios"] }),
  });

  const scenarios = q.data?.scenarios ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl font-semibold tracking-tight">Scenario Library</h1>
          <p className="muted mt-1 text-sm">
            Saved plans, notes, and shareable scenario links for collaboration.
          </p>
        </div>
        <Chip>{scenarios.length} saved</Chip>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="p-4">
          <GlassSectionTitle title="Saved scenarios" subtitle="Click to reopen the exact lever state." />
        </div>
        <div className="h-px w-full bg-white/10" />
        <div className="divide-y divide-white/10">
          {scenarios.length ? (
            scenarios.map((s) => {
              const params = overridesToSearchParams(s.overrides as any).toString();
              const href = `/games/${s.game_id}${params ? `?${params}` : ""}`;
              return (
                <div key={s.scenario_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={href} className="text-sm font-semibold hover:underline">
                        {s.game_id}
                      </Link>
                      <Chip>{new Date(s.created_at).toLocaleString()}</Chip>
                    </div>
                    {s.note ? <div className="muted mt-1 text-xs truncate">{s.note}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={href}>
                      <GlassButton variant="primary">Open</GlassButton>
                    </Link>
                    <GlassButton
                      onClick={() => del.mutate(s.scenario_id)}
                      disabled={del.isPending}
                    >
                      Delete
                    </GlassButton>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-sm muted">
              No saved scenarios yet. Open the hero game and click “Save”.
            </div>
          )}
        </div>
      </GlassCard>

      {q.isError ? (
        <div className="glass rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
          <div className="font-semibold">API error</div>
          <div className="muted mt-1">{String(q.error)}</div>
        </div>
      ) : null}
    </div>
  );
}


