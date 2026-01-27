"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Chip, GlassButton, GlassCard, GlassSectionTitle } from "@/components/ui/glass";
import { getGames } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function GamesPage() {
  const gamesQuery = useQuery({
    queryKey: ["games"],
    queryFn: () => getGames(),
  });

  const games = gamesQuery.data?.games ?? [];

  const osu = useMemo(() => {
    if (!games.length) return null;
    const home = games.find((g) => g.home_team === "Ohio State")?.home_team ?? "Ohio State";
    const venue = games.find((g) => g.venue_name)?.venue_name ?? "Ohio Stadium";
    const cap = games.find((g) => g.venue_capacity)?.venue_capacity ?? 102780;
    const avgAtt = Math.round(
      games.reduce((a, g) => a + g.baseline_attendance, 0) / games.length,
    );
    const avgStud = games.reduce((a, g) => a + g.baseline_student_ratio, 0) / games.length;
    const rivalryCount = games.filter((g) => g.rivalry_flag).length;
    return { home, venue, cap, avgAtt, avgStud, rivalryCount };
  }, [games]);

  const hero = games.find((g) => g.game_id === "michigan_at_osu_2026");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Team Overview <span className="muted text-sm font-normal">(mock season slice)</span>
          </h1>
          <p className="muted mt-1 text-sm">
            A super general view of the program, with a shortcut into the Michigan hero simulator.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hero ? (
            <Link href={`/games/${hero.game_id}`}>
              <GlassButton variant="primary">Open Michigan hero simulator</GlassButton>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <GlassCard className="lg:col-span-7 p-5">
          <GlassSectionTitle
            title="Ohio State — Season pulse"
            subtitle="Crowd, student mix, and operational posture at a glance."
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
              <div className="glass-strong rounded-2xl border border-white/10 p-4">
                <div className="muted text-xs">Avg student ratio</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">
                  {(osu.avgStud * 100).toFixed(1)}%
                </div>
                <div className="muted mt-1 text-xs">Composition lever for HFA</div>
              </div>
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
          <GlassSectionTitle title="Primary action" subtitle="Go deep on the single most important game." />
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
          {games.map((g) => (
            <Link key={g.game_id} href={`/games/${g.game_id}`} className="group">
              <GlassCard className="p-4 group-hover:-translate-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {g.away_team} <span className="muted">@</span>{" "}
                    <span className={g.game_id === "michigan_at_osu_2026" ? "scarlet" : ""}>
                      {g.home_team}
                    </span>
                  </div>
                  {g.rivalry_flag ? <Chip>Rivalry</Chip> : <Chip>{g.game_stakes}</Chip>}
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


