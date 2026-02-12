"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Crosshair } from "lucide-react";

import { Chip, GlassCard, GlassSectionTitle, GlassButton } from "@/components/ui/glass";
import { InteractiveHeatmap } from "@/components/viz/InteractiveHeatmap";
import { API_BASE_URL, getGame } from "@/lib/api";
import { isProfessionalGame } from "@/lib/sports";

type SensitivityResponse = {
  game_id: string;
  attendance: number[];
  student_ratio: number[];
  win_probability: number[][];
  meta?: Record<string, unknown>;
};

export default function SensitivityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const gameId = params.id;
  
  const [selectedPoint, setSelectedPoint] = useState<{ attendance: number; studentRatio: number } | null>(null);

  const q = useQuery({
    queryKey: ["sensitivity", gameId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/games/${encodeURIComponent(gameId)}/sensitivity`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as SensitivityResponse;
    },
  });

  const gameQuery = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => getGame(gameId),
  });

  const data = q.data;
  const game = gameQuery.data?.game;
  const showStudentRatio = !isProfessionalGame(game);

  // Transform data for InteractiveHeatmap
  const heatmapData = useMemo(() => {
    if (!data) return [];
    const cells: Array<{
      x: number;
      y: number;
      value: number;
      xLabel: string;
      yLabel: string;
    }> = [];
    
    data.attendance.forEach((att, xi) => {
      data.student_ratio.forEach((sr, yi) => {
        cells.push({
          x: att,
          y: sr,
          value: data.win_probability[yi]?.[xi] ?? 0,
          xLabel: att.toLocaleString(),
          yLabel: `${(sr * 100).toFixed(1)}%`,
        });
      });
    });
    
    return cells;
  }, [data]);

  const handleCellClick = (attendance: number, studentRatio: number) => {
    setSelectedPoint({ attendance, studentRatio });
  };

  const applyToSimulator = () => {
    if (!selectedPoint) return;
    const params = new URLSearchParams({
      attendance: String(selectedPoint.attendance),
      student_ratio: String(selectedPoint.studentRatio),
    });
    router.push(`/games/${gameId}?${params.toString()}`);
  };

  // Find the selected cell's win probability
  const selectedWinProb = useMemo(() => {
    if (!selectedPoint || !data) return null;
    const xi = data.attendance.indexOf(selectedPoint.attendance);
    const yi = data.student_ratio.indexOf(selectedPoint.studentRatio);
    if (xi >= 0 && yi >= 0) {
      return data.win_probability[yi]?.[xi];
    }
    return null;
  }, [selectedPoint, data]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="muted text-xs">
            <Link href={`/games/${gameId}`} className="hover:underline">
              {gameId}
            </Link>{" "}
            <span className="muted">/</span> sensitivity
          </div>
          <h1 className="display text-4xl font-semibold tracking-tight">
            Sensitivity <span className="text-[hsl(var(--scarlet))]">Surface</span>
          </h1>
          <p className="muted mt-1 text-sm">
            {showStudentRatio
              ? "Click any cell to select an attendance × student ratio combination, then apply it to the simulator."
              : "Click any cell to select an attendance × fan mix combination, then apply it to the simulator."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip>{data?.meta?.crowd_energy ? `Energy ${(data.meta.crowd_energy as number)}/100` : "Energy 78/100"}</Chip>
          <Link href={`/games/${gameId}`}>
            <GlassButton>
              <ArrowRight className="w-4 h-4" /> Simulator
            </GlassButton>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <GlassCard className="lg:col-span-8 p-4">
          <GlassSectionTitle
            title="Win Probability Heatmap"
            subtitle={
              showStudentRatio
                ? "Attendance × Student Ratio → Win Probability"
                : "Attendance × Fan Mix → Win Probability"
            }
            right={
              <div className="flex items-center gap-1 text-xs text-white/50">
                <Crosshair className="w-3 h-3" />
                Click to select
              </div>
            }
          />
          <div className="mt-4 relative">
            {data ? (
              <InteractiveHeatmap
                data={heatmapData}
                xAxis={{
                  label: "Attendance",
                  values: data.attendance,
                  format: (v) => `${(v / 1000).toFixed(0)}K`,
                }}
                yAxis={{
                  label: showStudentRatio ? "Student %" : "Fan mix",
                  values: data.student_ratio,
                  format: (v) => `${(v * 100).toFixed(0)}%`,
                }}
                valueLabel="Win Prob"
                valueFormat={(v) => `${(v * 100).toFixed(1)}%`}
                onCellClick={handleCellClick}
                colorScale="sequential"
              />
            ) : (
              <div className="h-[360px] w-full animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            )}
          </div>
        </GlassCard>

        {/* Selection Panel */}
        <GlassCard className="lg:col-span-4 p-4">
          <GlassSectionTitle
            title="Selected Point"
            subtitle="Apply to simulator"
          />
          
          {selectedPoint ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-4"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                  <span className="text-sm text-white/60">Attendance</span>
                  <span className="text-lg font-bold">{selectedPoint.attendance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                    <span className="text-sm text-white/60">
                      {showStudentRatio ? "Student Ratio" : "Fan Mix"}
                    </span>
                  <span className="text-lg font-bold">{(selectedPoint.studentRatio * 100).toFixed(1)}%</span>
                </div>
                {selectedWinProb != null && (
                  <div className="flex justify-between items-center p-3 rounded-xl bg-[hsl(var(--scarlet))]/10 border border-[hsl(var(--scarlet))]/30">
                    <span className="text-sm text-white/60">Win Probability</span>
                    <span className="text-lg font-bold text-[hsl(var(--scarlet))]">
                      {(selectedWinProb * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              <GlassButton
                variant="primary"
                className="w-full"
                onClick={applyToSimulator}
              >
                <ArrowRight className="w-4 h-4" />
                Apply to Simulator
              </GlassButton>
            </motion.div>
          ) : (
            <div className="mt-4 p-6 rounded-xl border-2 border-dashed border-white/10 text-center">
              <Crosshair className="w-8 h-8 mx-auto text-white/20 mb-2" />
              <p className="text-sm text-white/40">
                Click a cell in the heatmap to select a combination
              </p>
            </div>
          )}

          {/* Quick stats */}
          {data && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="text-xs text-white/50 mb-2">Surface Stats</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">Attendance range</span>
                  <span>{(Math.min(...data.attendance) / 1000).toFixed(0)}K – {(Math.max(...data.attendance) / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">
                    {showStudentRatio ? "Student ratio range" : "Fan mix range"}
                  </span>
                  <span>
                    {(Math.min(...data.student_ratio) * 100).toFixed(0)}% – {(Math.max(...data.student_ratio) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Grid size</span>
                  <span>{data.attendance.length} × {data.student_ratio.length}</span>
                </div>
              </div>
            </div>
          )}
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
