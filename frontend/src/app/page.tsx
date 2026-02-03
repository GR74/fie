"use client";

import Link from "next/link";

import { GlassCard, GlassSectionTitle, GlassButton } from "@/components/ui/glass";
import { SPORT_SCOPES } from "@/lib/sports";

export default function Home() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">
          Sport Dashboards{" "}
          <span className="bg-gradient-to-b from-[hsl(var(--scarlet-2))] to-[hsl(var(--scarlet))] bg-clip-text text-transparent">
            & Labs
          </span>
        </h1>
        <p className="muted mt-2 text-sm max-w-2xl">
          Pick a sport track to explore the same toolset across different contexts. Each dashboard
          keeps identical access (Simulator, Compare, Lab, Calibration, Scenarios) while the logic,
          ranges, and defaults shift to the sport&apos;s reality.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3 md:grid-cols-2">
        {SPORT_SCOPES.map((sport) => (
          <GlassCard key={sport.id} className="p-5 flex flex-col gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider muted">
                {sport.category}
              </div>
              <div className="mt-2 text-xl font-semibold">{sport.label}</div>
              <p className="muted mt-2 text-sm">{sport.description}</p>
            </div>

            <div className="glass-strong rounded-2xl border border-white/10 p-3 text-xs space-y-1">
              <div className="font-semibold">Quick bites</div>
              <div className="muted">{sport.bites[0]}</div>
              <div className="muted">{sport.bites[1]}</div>
              <div className="muted">{sport.bites[2]}</div>
            </div>

            <div className="grid gap-2">
              <Link href={`/dashboard?sport=${sport.id}`}>
                <GlassButton variant="primary" className="w-full">
                  Open {sport.shortLabel} dashboard
                </GlassButton>
              </Link>
              <Link href={`/scenario?sport=${sport.id}`}>
                <GlassButton className="w-full">Open {sport.shortLabel} lab</GlassButton>
              </Link>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5">
        <GlassSectionTitle
          title="Advisor alignment"
          subtitle="Small-bite decisions + research framing from the home-field advantage literature."
        />
        <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
          <div className="glass-strong rounded-2xl border border-white/10 p-4">
            <div className="font-semibold">Small bites</div>
            <div className="muted mt-1">
              Each sport track focuses on 3-4 constrained levers (venue choice, seats-open,
              staffing, student mix) so you can iterate quickly.
            </div>
          </div>
          <div className="glass-strong rounded-2xl border border-white/10 p-4">
            <div className="font-semibold">Venue tradeoffs</div>
            <div className="muted mt-1">
              Basketball/volleyball dashboards emphasize Covelli vs Schott hosting and the
              “open all seats” decision that changes perceived fill.
            </div>
          </div>
          <div className="glass-strong rounded-2xl border border-white/10 p-4">
            <div className="font-semibold">Research framing</div>
            <div className="muted mt-1">
              The simulator highlights crowd size, familiarity, weather, and neutral-site effects
              as key channels in home-field advantage research.
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
