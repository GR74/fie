"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";

import { Chip, GlassButton, GlassCard, GlassSectionTitle } from "@/components/ui/glass";
import { getGames } from "@/lib/api";
import { SportHeader } from "@/components/SportSwitcher";
import { getSportScope, isProfessionalSportId } from "@/lib/sports";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/cn";

export default function GamesPage() {
  const searchParams = useSearchParams();
  const sport = getSportScope(searchParams?.get("sport"));
  const showStudentRatio = !isProfessionalSportId(sport.id);

  const gamesQuery = useQuery({
    queryKey: ["games"],
    queryFn: () => getGames(),
  });

  const games = gamesQuery.data?.games ?? [];

  const scopedGames = useMemo(
    () => games.filter((g) => sport.filterGames(g)),
    [games, sport],
  );

  const osu = useMemo(() => {
    const pool = scopedGames.length ? scopedGames : games;
    if (!pool.length) return null;
    const home = pool.find((g) => g.home_team === "Ohio State")?.home_team ?? "Ohio State";
    const venue = pool.find((g) => g.venue_name)?.venue_name ?? "Ohio Stadium";
    const cap = pool.find((g) => g.venue_capacity)?.venue_capacity ?? 102780;
    const avgAtt = Math.round(
      pool.reduce((a, g) => a + g.baseline_attendance, 0) / pool.length,
    );
    const avgStud = pool.reduce((a, g) => a + g.baseline_student_ratio, 0) / pool.length;
    const rivalryCount = pool.filter((g) => g.rivalry_flag).length;
    const avgFill = cap ? avgAtt / cap : 0;
    return { home, venue, cap, avgAtt, avgStud, rivalryCount, avgFill };
  }, [games, scopedGames]);

  const hero =
    scopedGames.find((g) => g.rivalry_flag) ??
    scopedGames[0] ??
    games.find((g) => g.rivalry_flag) ??
    games[0];

  return (
    <div className="space-y-8">
      <SportHeader
        title="Team Overview"
        subtitle="A program snapshot, filtered to the selected sport track."
      />

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Season pulse */}
        <motion.div
          className="lg:col-span-7 relative rounded-2xl border border-white/[0.06] overflow-hidden"
          style={{ background: "linear-gradient(145deg, hsl(220 18% 7%) 0%, hsl(224 16% 10%) 50%, hsl(220 14% 7%) 100%)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(354,78%,55%)] via-[hsl(354,78%,40%)]/30 to-transparent" />
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white/90 tracking-tight">{sport.label} \u2014 Season pulse</div>
                <div className="text-[11px] text-white/30 mt-0.5">
                  {showStudentRatio
                    ? "Crowd, student mix, and operational posture at a glance."
                    : "Crowd, attendance, and operational posture at a glance."}
                </div>
              </div>
              {osu ? (
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.4)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {osu.venue}
                </span>
              ) : null}
            </div>

            {osu ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <motion.div
                  className="rounded-xl border border-white/[0.06] p-4"
                  style={{ background: "rgba(0,0,0,0.2)" }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-semibold">Avg baseline attendance</div>
                  <div className="mt-1.5 text-2xl font-bold tabular-nums text-white/80">
                    {osu.avgAtt.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[10px] text-white/25">Capacity {osu.cap.toLocaleString()}</div>
                </motion.div>
                {showStudentRatio ? (
                  <motion.div
                    className="rounded-xl border border-white/[0.06] p-4"
                    style={{ background: "rgba(0,0,0,0.2)" }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-semibold">Avg student ratio</div>
                    <div className="mt-1.5 text-2xl font-bold tabular-nums text-white/80">
                      {(osu.avgStud * 100).toFixed(1)}%
                    </div>
                    <div className="mt-1 text-[10px] text-white/25">Composition lever for HFA</div>
                  </motion.div>
                ) : (
                  <motion.div
                    className="rounded-xl border border-white/[0.06] p-4"
                    style={{ background: "rgba(0,0,0,0.2)" }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-semibold">Avg fill rate</div>
                    <div className="mt-1.5 text-2xl font-bold tabular-nums text-white/80">
                      {(osu.avgFill * 100).toFixed(1)}%
                    </div>
                    <div className="mt-1 text-[10px] text-white/25">Atmosphere efficiency</div>
                  </motion.div>
                )}
                <motion.div
                  className="rounded-xl border border-[hsl(354,78%,55%)]/10 p-4"
                  style={{ background: "rgba(187,0,0,0.04)" }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-semibold">Rivalry games</div>
                  <div className="mt-1.5 text-2xl font-bold tabular-nums text-[hsl(354,78%,55%)]">
                    {osu.rivalryCount}
                  </div>
                  <div className="mt-1 text-[10px] text-white/25">Highest impact scenarios</div>
                </motion.div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.04] p-4" style={{ background: "rgba(0,0,0,0.2)" }}>
                    <div className="h-2 w-20 animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-3 h-7 w-28 animate-pulse rounded bg-white/[0.06]" />
                    <div className="mt-3 h-2 w-24 animate-pulse rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Hero action card */}
        <motion.div
          className="lg:col-span-5 relative rounded-2xl border border-white/[0.06] overflow-hidden"
          style={{ background: "linear-gradient(145deg, hsl(220 18% 7%) 0%, hsl(224 16% 10%) 50%, hsl(220 14% 7%) 100%)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          <div className="p-5">
            <div className="text-sm font-semibold text-white/90 tracking-tight">Primary action</div>
            <div className="text-[11px] text-white/30 mt-0.5">Go deep on the most important game in this track.</div>

            {hero ? (
              <div className="mt-4 space-y-3">
                <div
                  className="rounded-xl border border-white/[0.06] p-4"
                  style={{ background: "rgba(0,0,0,0.2)" }}
                >
                  <div className="text-sm font-bold">
                    <span className="text-white/60">{hero.away_team}</span>
                    <span className="text-white/20 mx-1.5">@</span>
                    <span className={hero.rivalry_flag ? "text-[hsl(354,78%,55%)]" : "text-white/90"}>
                      {hero.home_team}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-white/30">
                    {hero.date} \u2022 {hero.kickoff_time_local} \u2022 baseline {hero.baseline_attendance.toLocaleString()}
                  </div>
                </div>
                <Link href={`/games/${hero.game_id}`}>
                  <GlassButton variant="primary" className="w-full">
                    Launch Game Day Simulator
                  </GlassButton>
                </Link>
                <Link href={`/games/${hero.game_id}/engine`}>
                  <GlassButton className="w-full">View Engine</GlassButton>
                </Link>
              </div>
            ) : (
              <div className="mt-4 text-sm text-white/30">Hero game not found in mock data.</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Games grid */}
      <div className="space-y-4">
        <GlassSectionTitle title="Games" subtitle="2025-26 schedule with real venues and attendance data." />
        <div className="grid gap-4 md:grid-cols-3">
          {(scopedGames.length ? scopedGames : games).map((g, i) => (
            <Link key={g.game_id} href={`/games/${g.game_id}`} className="group">
              <motion.div
                className="relative rounded-2xl border overflow-hidden transition-all duration-200 group-hover:-translate-y-1"
                style={{
                  background: g.rivalry_flag
                    ? "linear-gradient(145deg, hsl(354 30% 8%) 0%, hsl(354 20% 10%) 40%, hsl(220 16% 8%) 100%)"
                    : "linear-gradient(145deg, hsl(220 18% 7%), hsl(224 16% 10%))",
                  borderColor: g.rivalry_flag ? "hsl(354 78% 55% / 0.15)" : "rgba(255,255,255,0.06)",
                  boxShadow: g.rivalry_flag ? "0 0 15px hsl(354 78% 55% / 0.08)" : "none",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
              >
                {/* Accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background: g.rivalry_flag
                      ? "linear-gradient(90deg, hsl(354 78% 55%), hsl(354 78% 40% / 0.3), transparent)"
                      : g.game_stakes === "high"
                        ? "linear-gradient(90deg, #f59e0b80, #f59e0b20, transparent)"
                        : "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)",
                  }}
                />

                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold">
                      <span className="text-white/60">{g.away_team}</span>
                      <span className="text-white/20 mx-1.5">@</span>
                      <span className={g.rivalry_flag ? "text-[hsl(354,78%,55%)]" : "text-white/80"}>
                        {g.home_team}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {g.sport !== "football" && (
                        <span className="text-[9px] text-white/20 uppercase tracking-wider">{g.sport}</span>
                      )}
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{
                          background: g.rivalry_flag
                            ? "hsl(354 78% 55% / 0.12)" : "rgba(255,255,255,0.04)",
                          color: g.rivalry_flag ? "hsl(354 78% 55%)" : "rgba(255,255,255,0.35)",
                          border: `1px solid ${g.rivalry_flag ? "hsl(354 78% 55% / 0.2)" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        {g.rivalry_flag ? "Rivalry" : g.game_stakes}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-white/25">
                    {g.date} \u2022 {g.kickoff_time_local} \u2022 {g.venue_name}
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {gamesQuery.isError ? (
          <motion.div
            className="rounded-2xl border border-rose-500/20 p-4 text-sm"
            style={{ background: "rgba(239,68,68,0.06)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="font-semibold text-rose-400">API error</div>
            <div className="mt-1 text-white/40">{String(gamesQuery.error)}</div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
