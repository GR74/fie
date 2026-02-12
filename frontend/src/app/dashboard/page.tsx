"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";

import { Chip, GlassButton, GlassCard, GlassSectionTitle } from "@/components/ui/glass";
import { getGames } from "@/lib/api";
import { SportHeader } from "@/components/SportSwitcher";
import { getSportScope, isProfessionalGame } from "@/lib/sports";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/cn";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const sport = getSportScope(searchParams?.get("sport"));

  const gamesQuery = useQuery({
    queryKey: ["games"],
    queryFn: () => getGames(),
  });

  const games = gamesQuery.data?.games ?? [];
  const scopedGames = useMemo(
    () => games.filter((g) => sport.filterGames(g)),
    [games, sport],
  );
  const hero = scopedGames[0] ?? games.find((g) => g.game_id === "michigan_at_osu_2026");

  // Aggregate stats
  const stats = useMemo(() => {
    const pool = scopedGames.length ? scopedGames : games;
    if (!pool.length) return null;
    const totalGames = pool.length;
    const avgAtt = Math.round(pool.reduce((a, g) => a + g.baseline_attendance, 0) / pool.length);
    const rivalryCount = pool.filter((g) => g.rivalry_flag).length;
    const maxCap = Math.max(...pool.map((g) => g.venue_capacity));
    const avgFill = pool.reduce((a, g) => a + g.baseline_attendance / g.venue_capacity, 0) / pool.length;
    return { totalGames, avgAtt, rivalryCount, maxCap, avgFill };
  }, [games, scopedGames]);

  return (
    <div className="space-y-8">
      <SportHeader
        title="Dashboard"
        subtitle="A quick snapshot of the current sport track, with bite-sized decisions surfaced first."
      />

      {/* Hero game card */}
      {hero ? (
        <motion.div
          className="relative rounded-2xl border overflow-hidden"
          style={{
            background: hero.rivalry_flag
              ? "linear-gradient(145deg, hsl(354 30% 8%) 0%, hsl(354 20% 12%) 40%, hsl(220 16% 8%) 100%)"
              : "linear-gradient(145deg, hsl(220 18% 7%) 0%, hsl(224 16% 11%) 50%, hsl(220 14% 7%) 100%)",
            borderColor: hero.rivalry_flag ? "hsl(354 78% 55% / 0.2)" : "rgba(255,255,255,0.08)",
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Top accent */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r"
            style={{
              backgroundImage: hero.rivalry_flag
                ? "linear-gradient(90deg, hsl(354 78% 55%), hsl(354 78% 40% / 0.5), transparent)"
                : "linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1), transparent)",
            }}
          />

          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em]"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    Featured
                  </span>
                  {hero.rivalry_flag && (
                    <span
                      className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em]"
                      style={{
                        background: "hsl(354 78% 55% / 0.12)",
                        color: "hsl(354 78% 55%)",
                        border: "1px solid hsl(354 78% 55% / 0.25)",
                        boxShadow: "0 0 10px hsl(354 78% 55% / 0.15)",
                      }}
                    >
                      Rivalry
                    </span>
                  )}
                  {hero.sport !== "football" && <Chip>{hero.sport}</Chip>}
                </div>
                <div className="text-2xl font-bold tracking-tight">
                  <span className="text-white/80">{hero.away_team}</span>
                  <span className="text-white/25 mx-2">@</span>
                  <span className={hero.rivalry_flag ? "text-[hsl(354,78%,55%)]" : "text-white/90"}>
                    {hero.home_team}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/35">
                  <span>{hero.date}</span>
                  <span className="w-1 h-1 rounded-full bg-white/15" />
                  <span>{hero.kickoff_time_local}</span>
                  <span className="w-1 h-1 rounded-full bg-white/15" />
                  <span>{hero.venue_name}</span>
                  <span className="w-1 h-1 rounded-full bg-white/15" />
                  <span>cap {hero.venue_capacity.toLocaleString()}</span>
                </div>
              </div>
              <Link href={`/games/${hero.game_id}`}>
                <GlassButton variant="primary">Open Simulator</GlassButton>
              </Link>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* Aggregate stats */}
      {stats && (
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Games", value: stats.totalGames.toString(), sub: `${sport.label} schedule` },
            { label: "Avg attendance", value: stats.avgAtt.toLocaleString(), sub: `Max cap ${stats.maxCap.toLocaleString()}` },
            { label: "Avg fill rate", value: `${(stats.avgFill * 100).toFixed(1)}%`, sub: "Baseline fill" },
            { label: "Rivalry games", value: stats.rivalryCount.toString(), sub: "Highest impact" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="relative rounded-2xl border border-white/[0.06] overflow-hidden p-4"
              style={{ background: "linear-gradient(145deg, hsl(220 18% 7%), hsl(224 16% 10%))" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-semibold">{stat.label}</div>
              <div className={cn(
                "mt-1.5 text-2xl font-bold tabular-nums",
                stat.label === "Rivalry games" ? "text-[hsl(354,78%,55%)]" : "text-white/80",
              )}>
                {stat.value}
              </div>
              <div className="mt-1 text-[10px] text-white/25">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Games list */}
      <motion.div
        className="relative rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: "linear-gradient(145deg, hsl(220 18% 7%), hsl(224 16% 10%))" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="p-4 border-b border-white/[0.06]">
          <GlassSectionTitle
            title={`${sport.label} games`}
            subtitle="Click a game to simulate scenarios."
          />
        </div>
        <div className="divide-y divide-white/[0.04]">
          {(scopedGames.length ? scopedGames : games).map((g, i) => (
            <Link
              key={g.game_id}
              href={`/games/${g.game_id}`}
              className="group flex items-center justify-between gap-4 px-4 py-3 transition-all duration-200 hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-1 h-8 rounded-full shrink-0 transition-all duration-200 group-hover:h-10"
                  style={{
                    background: g.rivalry_flag
                      ? "hsl(354 78% 55%)"
                      : g.game_stakes === "high"
                        ? "#f59e0b"
                        : "rgba(255,255,255,0.1)",
                    boxShadow: g.rivalry_flag ? "0 0 6px hsl(354 78% 55% / 0.3)" : "none",
                  }}
                />
                <div>
                  <div className="text-sm font-semibold">
                    <span className="text-white/60">{g.away_team}</span>
                    <span className="text-white/20 mx-1.5">@</span>
                    <span className={g.rivalry_flag ? "text-[hsl(354,78%,55%)]" : "text-white/80"}>
                      {g.home_team}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/25 mt-0.5">
                    {g.date} {g.kickoff_time_local} \u2022 {g.venue_name} \u2022 baseline {g.baseline_attendance.toLocaleString()}
                    {!isProfessionalGame(g) ? ` \u2022 students ${(g.baseline_student_ratio * 100).toFixed(1)}%` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {g.sport !== "football" && (
                  <span className="text-[10px] text-white/20 uppercase tracking-wider">{g.sport}</span>
                )}
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: g.rivalry_flag
                      ? "hsl(354 78% 55% / 0.1)"
                      : "rgba(255,255,255,0.04)",
                    color: g.rivalry_flag
                      ? "hsl(354 78% 55%)"
                      : "rgba(255,255,255,0.4)",
                    border: `1px solid ${g.rivalry_flag ? "hsl(354 78% 55% / 0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  {g.rivalry_flag ? "Rivalry" : g.game_stakes}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Bite-sized insights */}
      <div className="grid gap-3 md:grid-cols-3">
        {sport.bites.map((bite, i) => (
          <motion.div
            key={bite}
            className="relative rounded-2xl border border-white/[0.06] overflow-hidden p-4"
            style={{ background: "linear-gradient(145deg, hsl(220 18% 7%), hsl(224 16% 10%))" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-semibold">Insight</div>
            <div className="mt-2 text-sm font-medium text-white/60 leading-relaxed">{bite}</div>
          </motion.div>
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
  );
}
