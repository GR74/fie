"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Chip, GlassButton, GlassCard, GlassSectionTitle } from "@/components/ui/glass";
import { getGames } from "@/lib/api";
import { SportHeader } from "@/components/SportSwitcher";
import { getSportScope, isProfessionalGame } from "@/lib/sports";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

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

  return (
    <div className="space-y-8">
      <SportHeader
        title="Dashboard"
        subtitle="A quick snapshot of the current sport track, with bite-sized decisions surfaced first."
      />

      {hero ? (
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Chip>Hero</Chip>
                {hero.rivalry_flag ? <Chip>The Game</Chip> : null}
              </div>
              <div className="mt-2 text-xl font-semibold">
                {hero.away_team} @ {hero.home_team}
              </div>
              <div className="muted mt-1 text-sm">
                {hero.date} • {hero.kickoff_time_local} • Capacity{" "}
                {hero.venue_capacity.toLocaleString()}
              </div>
            </div>
            <Link href={`/games/${hero.game_id}`}>
              <GlassButton variant="primary">Open simulator</GlassButton>
            </Link>
          </div>
        </GlassCard>
      ) : null}

      <GlassCard className="overflow-hidden">
        <div className="p-4">
          <GlassSectionTitle
            title={`${sport.label} games`}
            subtitle="Click a game to simulate scenarios."
          />
        </div>
        <div className="h-px w-full bg-white/10" />
        <div className="divide-y divide-white/10">
          {(scopedGames.length ? scopedGames : games).map((g) => (
            <Link
              key={g.game_id}
              href={`/games/${g.game_id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-white/10"
            >
              <div>
                <div className="text-sm font-semibold">
                  {g.away_team} @ {g.home_team}
                </div>
                <div className="muted text-xs">
                  {g.date} • {g.kickoff_time_local} • baseline{" "}
                  {g.baseline_attendance.toLocaleString()}
                  {!isProfessionalGame(g)
                    ? ` • students ${(g.baseline_student_ratio * 100).toFixed(1)}%`
                    : ""}
                </div>
              </div>
              <Chip>{g.rivalry_flag ? "Rivalry" : g.game_stakes}</Chip>
            </Link>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-3">
        {sport.bites.map((bite) => (
          <GlassCard key={bite} className="p-4">
            <div className="muted text-xs">Small bite</div>
            <div className="mt-2 text-sm font-semibold">{bite}</div>
          </GlassCard>
        ))}
      </div>

      {gamesQuery.isError ? (
        <div className="glass rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
          <div className="font-semibold">API error</div>
          <div className="muted mt-1">{String(gamesQuery.error)}</div>
        </div>
      ) : null}
    </div>
  );
}
