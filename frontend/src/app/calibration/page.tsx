"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

import { Chip, GlassCard, GlassSectionTitle } from "@/components/ui/glass";
import { API_BASE_URL } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

type CalibrationBucket = {
  bin_lo: number;
  bin_hi: number;
  count: number;
  avg_pred: number;
  avg_obs: number | null;
};

type CalibrationResponse = {
  model: string;
  n: number;
  bins: number;
  brier: number;
  buckets: CalibrationBucket[];
};

export default function CalibrationPage() {
  const q = useQuery({
    queryKey: ["calibration-hfa"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/calibration/hfa`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as CalibrationResponse;
    },
  });

  const curve = useMemo(() => {
    const buckets = q.data?.buckets ?? [];
    return buckets
      .filter((b) => b.count > 0 && b.avg_obs != null)
      .map((b) => ({
        p: b.avg_pred,
        obs: b.avg_obs ?? 0,
      }));
  }, [q.data?.buckets]);

  const counts = useMemo(() => {
    const buckets = q.data?.buckets ?? [];
    return buckets.map((b) => ({
      bin: `${Math.round(b.bin_lo * 100)}–${Math.round(b.bin_hi * 100)}%`,
      count: b.count,
    }));
  }, [q.data?.buckets]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl font-semibold tracking-tight">Calibration</h1>
          <p className="muted mt-1 text-sm">
            Reliability + backtest metrics for the HFA engine. (Mock data now; real data later.)
          </p>
        </div>
        <Chip>{q.data?.model ?? "hfa_mock_v1"}</Chip>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <GlassCard className="lg:col-span-7 p-4">
          <GlassSectionTitle
            title="Reliability curve"
            subtitle="Avg predicted probability vs observed win rate per bin."
            right={q.data ? <Chip>Brier {q.data.brier.toFixed(3)}</Chip> : <Chip>Loading…</Chip>}
          />
          <div className="mt-4 h-[360px] min-h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                <XAxis
                  dataKey="p"
                  type="number"
                  domain={[0, 1]}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                />
                <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip
                  formatter={(v: number, name) => [
                    `${(v * 100).toFixed(1)}%`,
                    name === "obs" ? "Observed" : "Predicted",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="obs"
                  stroke="hsl(var(--scarlet))"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="p"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-5 p-4">
          <GlassSectionTitle title="Bin coverage" subtitle="How many samples land in each probability bin." />
          <div className="mt-4 h-[360px] min-h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counts} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                <XAxis dataKey="bin" tick={{ fontSize: 11 }} interval={1} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--scarlet))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {q.isError ? (
        <div className="glass rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
          <div className="font-semibold">API error</div>
          <div className="muted mt-1">{String(q.error)}</div>
        </div>
      ) : null}
    </div>
  );
}

