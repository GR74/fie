"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GlassCard, GlassSectionTitle, GlassButton } from "@/components/ui/glass";
import { getGame, simulateGame } from "@/lib/api";

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}
function usd(x: number) {
  return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function CompareVenuesPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const gameQuery = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => getGame(gameId),
  });

  const game = gameQuery.data?.game;
  const baseOverrides = {
    attendance: game ? Math.min(game.baseline_attendance, game.venue_capacity) : 0,
    student_ratio: game?.baseline_student_ratio ?? 0.2,
    crowd_energy: 78,
    stands_open_pct: 85,
    staff_per_stand: 6,
  };

  const simPrimary = useQuery({
    queryKey: ["simulate", gameId, "venue-primary"],
    queryFn: () => simulateGame(gameId, baseOverrides),
    enabled: !!game && !!gameId,
  });

  const simAlternate = useQuery({
    queryKey: ["simulate", gameId, "venue-alternate"],
    queryFn: () =>
      simulateGame(gameId, {
        ...baseOverrides,
        venue_id: game?.alternate_venue_id ?? undefined,
        attendance: game
          ? Math.min(
              game.baseline_attendance,
              game.alternate_venue_capacity ?? game.venue_capacity,
            )
          : 0,
      }),
    enabled: !!game?.alternate_venue_id && !!gameId,
  });

  const primary = simPrimary.data?.counterfactual;
  const alternate = simAlternate.data?.counterfactual;

  if (gameQuery.isLoading || !game) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-64 animate-pulse rounded-2xl bg-white/10" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-64 animate-pulse rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (!game.alternate_venue_id) {
    return (
      <div className="space-y-8">
        <GlassCard className="p-8 text-center">
          <GlassSectionTitle
            title="Venue comparison"
            subtitle="Compare the same game at two different venues."
          />
          <p className="muted mt-4">
            This game has no alternate venue configured. Venue comparison is available for games
            that can be hosted at two venues (e.g. Schott vs Covelli for basketball).
          </p>
          <Link href={`/games/${gameId}`}>
            <GlassButton className="mt-6">Back to simulator</GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const primaryName = game.venue_name;
  const primaryCap = game.venue_capacity;
  const alternateName = game.alternate_venue_name ?? "Alternate venue";
  const alternateCap = game.alternate_venue_capacity ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="muted text-xs">
            <Link href={`/games/${gameId}`} className="hover:underline">
              {game.away_team} @ {game.home_team}
            </Link>
            {" / "}
            <span className="font-medium">Compare venues</span>
          </div>
          <h1 className="display text-3xl font-semibold tracking-tight sm:text-4xl">
            Venue comparison
          </h1>
          <p className="muted mt-1 text-sm">
            Same scenario at {primaryName} vs {alternateName}. Use this to decide where to host.
          </p>
        </div>
        <Link href={`/games/${gameId}`}>
          <GlassButton>Back to simulator</GlassButton>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard className="p-5">
          <GlassSectionTitle
            title={primaryName}
            subtitle={`Capacity ${primaryCap.toLocaleString()}`}
          />
          {simPrimary.isLoading || !primary ? (
            <div className="mt-4 h-48 animate-pulse rounded-xl bg-white/5" />
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs text-white/40">Win probability</div>
                <div className="text-2xl font-bold text-[hsl(var(--scarlet))]">
                  {pct(primary.hfa.predicted_win_probability)}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40">Loudness</div>
                <div className="text-2xl font-bold">
                  {primary.noise.projected_decibels.toFixed(1)} dB
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40">Concessions revenue</div>
                <div className="text-2xl font-bold">{usd(primary.concessions.revenue_total_usd)}</div>
              </div>
              <div>
                <div className="text-xs text-white/40">Peak utilization</div>
                <div className="text-2xl font-bold">
                  {(primary.concessions.ops.worst_utilization * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <GlassSectionTitle
            title={alternateName}
            subtitle={`Capacity ${alternateCap.toLocaleString()}`}
          />
          {simAlternate.isLoading || !alternate ? (
            <div className="mt-4 h-48 animate-pulse rounded-xl bg-white/5" />
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs text-white/40">Win probability</div>
                <div className="text-2xl font-bold text-[hsl(var(--scarlet))]">
                  {pct(alternate.hfa.predicted_win_probability)}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40">Loudness</div>
                <div className="text-2xl font-bold">
                  {alternate.noise.projected_decibels.toFixed(1)} dB
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40">Concessions revenue</div>
                <div className="text-2xl font-bold">{usd(alternate.concessions.revenue_total_usd)}</div>
              </div>
              <div>
                <div className="text-xs text-white/40">Peak utilization</div>
                <div className="text-2xl font-bold">
                  {(alternate.concessions.ops.worst_utilization * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <div className="text-sm text-white/60">
          Same baseline scenario (attendance, student ratio, crowd energy) applied to each venue.
          Primary venue uses full capacity; alternate uses its lower capacity and may show higher
          fill and different HFA/noise/revenue. Adjust levers on the main simulator and re-run
          comparison for custom scenarios.
        </div>
      </GlassCard>
    </div>
  );
}
