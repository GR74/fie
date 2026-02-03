"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Chip, GlassButton, GlassCard, GlassSectionTitle } from "@/components/ui/glass";
import { getGames } from "@/lib/api";
import { SportHeader } from "@/components/SportSwitcher";
import { getSportScope, isProfessionalSportId } from "@/lib/sports";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

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
    scopedGames.find((g) => g.game_id === "michigan_at_osu_2026") ??
    scopedGames[0] ??
    games.find((g) => g.game_id === "michigan_at_osu_2026");

  return (
    <div className="space-y-8">
      <SportHeader
        title="Team Overview"
        subtitle="A program snapshot, filtered to the selected sport track."
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <GlassCard className="lg:col-span-7 p-5">
          <GlassSectionTitle
            title={`${sport.label} — Season pulse`}
            subtitle={
              showStudentRatio
                ? "Crowd, student mix, and operational posture at a glance."
                : "Crowd, attendance, and operational posture at a glance."
            }
            right={osu ? <Chip>{osu.venue}</Chip> : <Chip>Loading…</Chip>}
          />

          {osu ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="glass-strong rounded-2xl border border-white/10 p-4">
                <div className="muted text-xs">Avg baseline attendance</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">
                  {osu.avgAtt.toLocaleString()}
                </div>
                <div className="muted mt-1 text-xs">Capacity {osu.cap.toLocaleString()}</div>
              </div>
              {showStudentRatio ? (
                <div className="glass-strong rounded-2xl border border-white/10 p-4">
                  <div className="muted text-xs">Avg student ratio</div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight">
                    {(osu.avgStud * 100).toFixed(1)}%
                  </div>
                  <div className="muted mt-1 text-xs">Composition lever for HFA</div>
                </div>
              ) : (
                <div className="glass-strong rounded-2xl border border-white/10 p-4">
                  <div className="muted text-xs">Avg fill rate</div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight">
                    {(osu.avgFill * 100).toFixed(1)}%
                  </div>
                  <div className="muted mt-1 text-xs">Atmosphere efficiency</div>
                </div>
              )}
              <div className="glass-strong rounded-2xl border border-white/10 p-4">
                <div className="muted text-xs">Rivalry games</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight scarlet">
                  {osu.rivalryCount}
                </div>
                <div className="muted mt-1 text-xs">Highest impact scenarios</div>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-strong rounded-2xl border border-white/10 p-4">
                  <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
                  <div className="mt-3 h-8 w-40 animate-pulse rounded bg-white/10" />
                  <div className="mt-3 h-3 w-24 animate-pulse rounded bg-white/10" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="lg:col-span-5 p-5">
          <GlassSectionTitle title="Primary action" subtitle="Go deep on the most important game in this track." />
          {hero ? (
            <div className="mt-4 space-y-3">
              <div className="glass-strong rounded-2xl border border-white/10 p-4">
                <div className="text-sm font-semibold">
                  {hero.away_team} <span className="muted">@</span>{" "}
                  <span className="scarlet">{hero.home_team}</span>
                </div>
                <div className="muted mt-1 text-xs">
                  {hero.date} • {hero.kickoff_time_local} • baseline{" "}
                  {hero.baseline_attendance.toLocaleString()}
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
            <div className="muted mt-4 text-sm">Hero game not found in mock data.</div>
          )}
        </GlassCard>
      </div>

      <div className="space-y-4">
        <GlassSectionTitle title="Games" subtitle="Small mock schedule slice for comparison." />
        <div className="grid gap-4 md:grid-cols-3">
          {(scopedGames.length ? scopedGames : games).map((g) => (
            <Link key={g.game_id} href={`/games/${g.game_id}`} className="group">
              <GlassCard className="p-4 group-hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {g.away_team} <span className="muted">@</span>{" "}
                    <span className={g.game_id === "michigan_at_osu_2026" ? "scarlet" : ""}>
                      {g.home_team}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.sport !== "football" ? <Chip>{g.sport}</Chip> : null}
                    {g.rivalry_flag ? <Chip>Rivalry</Chip> : <Chip>{g.game_stakes}</Chip>}
                  </div>
                </div>
                <div className="muted mt-2 text-xs">
                  {g.date} • {g.kickoff_time_local} • {g.venue_name}
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>

        {gamesQuery.isError ? (
          <div className="glass rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
            <div className="font-semibold">API error</div>
            <div className="muted mt-1">{String(gamesQuery.error)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
