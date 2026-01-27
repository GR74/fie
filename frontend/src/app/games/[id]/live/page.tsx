"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  Radio, 
  Users, 
  Volume2, 
  DollarSign, 
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity
} from "lucide-react";

import { GlassCard, GlassSectionTitle, GlassButton, Chip } from "@/components/ui/glass";
import { HudDivider } from "@/components/ui/hud";
import { GameClock } from "@/components/GameClock";
import { LiveMetricCard, LiveMetricCompact } from "@/components/LiveMetricCard";
import { getGame, simulateGame } from "@/lib/api";

const PERIOD_CONFIGS = {
  1: { name: "Pre-Game", attendanceFactor: 0.3, concessionActivity: "low" },
  2: { name: "Q1", attendanceFactor: 0.85, concessionActivity: "medium" },
  3: { name: "Q2", attendanceFactor: 0.95, concessionActivity: "medium" },
  4: { name: "Halftime", attendanceFactor: 1.0, concessionActivity: "high" },
  5: { name: "Q3", attendanceFactor: 0.92, concessionActivity: "medium" },
  6: { name: "Q4", attendanceFactor: 0.88, concessionActivity: "low" },
  7: { name: "Post-Game", attendanceFactor: 0.4, concessionActivity: "low" },
};

export default function LiveGameDayPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const [currentQuarter, setCurrentQuarter] = useState(1);
  const [currentMinute, setCurrentMinute] = useState(15);
  const [simulatedEvents, setSimulatedEvents] = useState<string[]>([]);

  const gameQuery = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => getGame(gameId),
  });

  // Simulate with "live" parameters based on current game state
  const simulateQuery = useQuery({
    queryKey: ["live-sim", gameId, currentQuarter],
    queryFn: () => simulateGame(gameId, {
      crowd_energy: currentQuarter >= 4 ? 90 : 75 + currentQuarter * 5,
      stands_open_pct: currentQuarter === 4 ? 100 : 85,
      staff_per_stand: currentQuarter === 4 ? 10 : 6,
    }),
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const game = gameQuery.data?.game;
  const sim = simulateQuery.data;

  // Simulate live events
  useEffect(() => {
    const events = [
      "🏈 Kickoff! Game underway",
      "📣 Student section at full capacity",
      "🌭 Concession lines forming at Section 12",
      "🔊 Crowd noise reaching 108 dB",
      "⚡ Express lanes handling overflow",
      "🎉 Touchdown! Crowd energy surging",
      "⚠️ Halftime rush beginning",
      "✅ All stands fully staffed",
    ];
    
    const interval = setInterval(() => {
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      setSimulatedEvents(prev => [
        `${new Date().toLocaleTimeString()} - ${randomEvent}`,
        ...prev.slice(0, 9)
      ]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const periodConfig = PERIOD_CONFIGS[currentQuarter as keyof typeof PERIOD_CONFIGS] || PERIOD_CONFIGS[1];

  // Calculate live metrics
  const liveAttendance = useMemo(() => {
    if (!game) return 0;
    return Math.floor(game.baseline_attendance * periodConfig.attendanceFactor);
  }, [game, periodConfig]);

  const opsStatus = useMemo(() => {
    const util = sim?.counterfactual.concessions.ops.worst_utilization ?? 0;
    if (util > 1.0) return "critical";
    if (util > 0.9) return "warning";
    return "good";
  }, [sim]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="muted text-xs flex items-center gap-2">
            <Link href={`/games/${gameId}`} className="hover:underline">
              {gameId}
            </Link>
            <span>/</span>
            <span className="font-medium">Live</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <h1 className="display text-4xl font-semibold tracking-tight mt-2">
            Game Day <span className="text-[hsl(var(--scarlet))]">Command Center</span>
          </h1>
          <p className="muted mt-1 text-sm">
            Real-time operations monitoring and game day metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-rose-400" />
            Simulated Mode
          </Chip>
          <Link href={`/games/${gameId}`}>
            <GlassButton>Back to Simulator</GlassButton>
          </Link>
        </div>
      </div>

      <HudDivider className="opacity-40" />

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Game Clock */}
        <GlassCard className="lg:col-span-4 p-6">
          <GameClock
            initialMinutes={15}
            quarter={currentQuarter}
            onQuarterChange={setCurrentQuarter}
            onTimeChange={(m) => setCurrentMinute(m)}
          />
        </GlassCard>

        {/* Key Metrics */}
        <div className="lg:col-span-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LiveMetricCard
            label="Current Attendance"
            value={liveAttendance.toLocaleString()}
            previousValue={game?.baseline_attendance.toLocaleString()}
            status={liveAttendance > (game?.baseline_attendance ?? 0) * 0.9 ? "good" : "warning"}
            trend={currentQuarter > 1 ? "up" : "flat"}
            icon={<Users className="w-4 h-4" />}
          />
          <LiveMetricCard
            label="Crowd Energy"
            value={`${sim?.counterfactual.noise.energy_score ?? 0}/100`}
            status={
              (sim?.counterfactual.noise.energy_score ?? 0) >= 80 ? "good" :
              (sim?.counterfactual.noise.energy_score ?? 0) >= 60 ? "neutral" : "warning"
            }
            trend={(sim?.counterfactual.noise.energy_score ?? 0) >= 75 ? "up" : "flat"}
            icon={<Activity className="w-4 h-4" />}
          />
          <LiveMetricCard
            label="Stadium Noise"
            value={`${(sim?.counterfactual.noise.projected_decibels ?? 0).toFixed(0)}`}
            unit="dB"
            status={
              (sim?.counterfactual.noise.projected_decibels ?? 0) >= 105 ? "good" : "neutral"
            }
            icon={<Volume2 className="w-4 h-4" />}
          />
          <LiveMetricCard
            label="Ops Utilization"
            value={`${((sim?.counterfactual.concessions.ops.worst_utilization ?? 0) * 100).toFixed(0)}%`}
            status={opsStatus}
            icon={<Clock className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Operations Dashboard */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Concessions Status */}
        <GlassCard className="lg:col-span-5 p-4">
          <GlassSectionTitle
            title="Concessions Operations"
            subtitle="Real-time stand status"
            right={
              <Chip className={
                opsStatus === "critical" ? "bg-rose-500/20 text-rose-400" :
                opsStatus === "warning" ? "bg-amber-500/20 text-amber-400" :
                "bg-emerald-500/20 text-emerald-400"
              }>
                {opsStatus === "critical" ? "⚠️ Overload" :
                 opsStatus === "warning" ? "📊 Busy" : "✅ Normal"}
              </Chip>
            }
          />
          
          <div className="mt-4 grid grid-cols-3 gap-4">
            <LiveMetricCompact
              label="Stands Open"
              value={`${sim?.counterfactual.concessions.ops.stands_open ?? 0}/${sim?.counterfactual.concessions.ops.stands_total ?? 0}`}
              status="neutral"
            />
            <LiveMetricCompact
              label="Staff/Stand"
              value={sim?.counterfactual.concessions.ops.staff_per_stand ?? 0}
              status="neutral"
            />
            <LiveMetricCompact
              label="Revenue"
              value={`$${((sim?.counterfactual.concessions.revenue_total_usd ?? 0) / 1000).toFixed(0)}K`}
              status="good"
            />
          </div>

          {/* Wait times by period */}
          <div className="mt-4 space-y-2">
            <div className="text-xs font-semibold text-white/50">Current Wait Times</div>
            {(sim?.counterfactual.concessions.ops.wait_time_windows ?? []).map((w) => {
              const isCurrentPeriod = 
                (currentQuarter <= 2 && w.window === "pre_kick") ||
                (currentQuarter === 4 && w.window === "halftime") ||
                (currentQuarter >= 5 && w.window === "q4");
              
              return (
                <div
                  key={w.window}
                  className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                    isCurrentPeriod ? "bg-[hsl(var(--scarlet))]/10 border border-[hsl(var(--scarlet))]/30" : "bg-white/5"
                  }`}
                >
                  <span className="text-sm font-medium">
                    {w.window === "pre_kick" ? "Pre-Kick" : w.window === "halftime" ? "Halftime" : "Q4"}
                    {isCurrentPeriod && <span className="ml-2 text-[10px] text-[hsl(var(--scarlet))]">NOW</span>}
                  </span>
                  <span className={`text-sm font-mono ${
                    w.utilization > 1 ? "text-rose-400" :
                    w.utilization > 0.9 ? "text-amber-400" : "text-white/70"
                  }`}>
                    {w.wait_minutes_band[0]}-{w.wait_minutes_band[1]} min
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Live Event Feed */}
        <GlassCard className="lg:col-span-4 p-4">
          <GlassSectionTitle
            title="Live Event Feed"
            subtitle="Real-time updates"
            right={<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          />
          
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {simulatedEvents.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">
                Waiting for events...
              </div>
            ) : (
              simulatedEvents.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs p-2 rounded-lg bg-white/5"
                >
                  {event}
                </motion.div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard className="lg:col-span-3 p-4">
          <GlassSectionTitle
            title="Quick Actions"
            subtitle="Emergency controls"
          />
          
          <div className="mt-4 space-y-2">
            <button className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Open All Stands
            </button>
            <button className="w-full p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition flex items-center justify-center gap-2">
              ⚡ Enable Express Lanes
            </button>
            <button className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Boost Staffing
            </button>
            <button className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-semibold hover:bg-rose-500/20 transition flex items-center justify-center gap-2">
              🚨 Emergency Alert
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Revenue Tracker */}
      <GlassCard className="p-4">
        <GlassSectionTitle
          title="Revenue Tracking"
          subtitle="Cumulative game day revenue"
          right={
            <div className="text-2xl font-bold text-[hsl(var(--scarlet))]">
              ${((sim?.counterfactual.concessions.revenue_total_usd ?? 0) * periodConfig.attendanceFactor / 1000000).toFixed(2)}M
            </div>
          }
        />
        
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-xs text-white/50 mb-1">Students</div>
            <div className="text-lg font-bold">
              ${((sim?.counterfactual.concessions.revenue_students_usd ?? 0) * periodConfig.attendanceFactor / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-xs text-white/50 mb-1">General</div>
            <div className="text-lg font-bold">
              ${((sim?.counterfactual.concessions.revenue_nonstudents_usd ?? 0) * periodConfig.attendanceFactor / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <div className="text-xs text-white/50 mb-1">Per Cap</div>
            <div className="text-lg font-bold">
              ${(sim?.counterfactual.concessions.per_cap_spend_usd ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="text-center p-3 rounded-xl bg-emerald-500/10">
            <div className="text-xs text-emerald-400 mb-1">Margin</div>
            <div className="text-lg font-bold text-emerald-400">
              ${((sim?.counterfactual.concessions.gross_margin_usd ?? 0) * periodConfig.attendanceFactor / 1000).toFixed(0)}K
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

