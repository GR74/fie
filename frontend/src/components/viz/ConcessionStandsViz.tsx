"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface WaitWindow {
  window: string;
  utilization: number;
  wait_minutes_band: [number, number];
  queue?: {
    rho: number;
    p_wait: number;
    wq_min: number;
    p_wait_gt_15: number;
  };
}

interface ConcessionStandsVizProps {
  standsOpen: number;
  standsTotal: number;
  staffPerStand: number;
  worstUtilization: number;
  waitWindows: WaitWindow[];
  revenueTotal: number;
  perCapSpend: number;
  expressLanes?: boolean;
  className?: string;
}

function useAnimatedNumber(target: number, duration = 500) {
  const [value, setValue] = useState(target);
  const ref = useRef(target);

  useEffect(() => {
    const start = ref.current;
    const end = target;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(start + (end - start) * eased);
      if (t < 1) requestAnimationFrame(tick);
      else ref.current = end;
    }
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

function getUtilColor(util: number) {
  if (util > 1.0) return { bg: "#ef4444", glow: "#ef444460", label: "Overload" };
  if (util > 0.9) return { bg: "#f59e0b", glow: "#f59e0b40", label: "Critical" };
  if (util > 0.7) return { bg: "#eab308", glow: "#eab30830", label: "Busy" };
  return { bg: "#22c55e", glow: "#22c55e30", label: "Normal" };
}

export function ConcessionStandsViz({
  standsOpen,
  standsTotal,
  staffPerStand,
  worstUtilization,
  waitWindows,
  revenueTotal,
  perCapSpend,
  expressLanes = false,
  className = "",
}: ConcessionStandsVizProps) {
  const animRevenue = useAnimatedNumber(revenueTotal);
  const animPerCap = useAnimatedNumber(perCapSpend);
  const animUtil = useAnimatedNumber(worstUtilization * 100);

  const stands = useMemo(() => {
    return Array.from({ length: standsTotal }, (_, i) => ({
      id: i,
      open: i < standsOpen,
      utilization: i < standsOpen
        ? Math.min(1.5, worstUtilization * (0.55 + Math.sin(i * 2.3) * 0.2 + 0.25))
        : 0,
    }));
  }, [standsOpen, standsTotal, worstUtilization]);

  const statusInfo = useMemo(() => {
    if (worstUtilization > 1.0) return { label: "OVERLOADED", color: "#ef4444", glow: "rgba(239,68,68,0.3)" };
    if (worstUtilization > 0.9) return { label: "CRITICAL", color: "#f59e0b", glow: "rgba(245,158,11,0.2)" };
    if (worstUtilization > 0.7) return { label: "BUSY", color: "#eab308", glow: "rgba(234,179,8,0.15)" };
    return { label: "SMOOTH", color: "#22c55e", glow: "rgba(34,197,94,0.15)" };
  }, [worstUtilization]);

  return (
    <motion.div
      className={`rounded-2xl border border-white/[0.08] overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      style={{
        background: "linear-gradient(155deg, hsl(220 18% 6%) 0%, hsl(224 16% 10%) 50%, hsl(220 14% 7%) 100%)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white/90">Concession Operations</div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest font-medium mt-0.5">
            {standsOpen}/{standsTotal} stands open | {staffPerStand} staff/stand
          </div>
        </div>
        <motion.div
          className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            backgroundColor: `${statusInfo.color}15`,
            color: statusInfo.color,
            boxShadow: `0 0 12px ${statusInfo.glow}`,
            border: `1px solid ${statusInfo.color}20`,
          }}
          animate={worstUtilization > 1.0 ? {
            boxShadow: [`0 0 10px ${statusInfo.glow}`, `0 0 22px ${statusInfo.glow}`, `0 0 10px ${statusInfo.glow}`],
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {statusInfo.label}
        </motion.div>
      </div>

      {/* Stand grid visualization */}
      <div className="p-4">
        <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(0,0,0,0.25)" }}>
          {/* Utilization bar at top */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold w-16">Peak util</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${Math.min(100, animUtil)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                  background: `linear-gradient(90deg, ${statusInfo.color}90, ${statusInfo.color})`,
                  boxShadow: `0 0 10px ${statusInfo.glow}`,
                }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color: statusInfo.color }}>
              {animUtil.toFixed(0)}%
            </span>
          </div>

          {/* Stand grid */}
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.min(standsTotal, 13)}, 1fr)` }}>
            {stands.map((stand) => {
              const colors = getUtilColor(stand.utilization);
              return (
                <div
                  key={stand.id}
                  className="relative aspect-square rounded-[3px] transition-all duration-300"
                  style={{
                    background: stand.open ? "hsl(220 15% 12%)" : "hsl(220 12% 6%)",
                    boxShadow: stand.open && stand.utilization > 0.8
                      ? `0 0 6px ${colors.glow}`
                      : "none",
                  }}
                  title={stand.open
                    ? `Stand ${stand.id + 1}: ${(stand.utilization * 100).toFixed(0)}% util`
                    : `Stand ${stand.id + 1}: Closed`
                  }
                >
                  {stand.open && (
                    <>
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 rounded-b-[3px]"
                        animate={{ height: `${Math.min(100, stand.utilization * 100)}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{ background: colors.bg }}
                      />
                      {stand.utilization > 1.0 && (
                        <div
                          className="absolute inset-0 rounded-[3px] animate-pulse"
                          style={{ background: `${colors.bg}30` }}
                        />
                      )}
                    </>
                  )}
                  {!stand.open && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 text-[8px] text-white/25 uppercase tracking-widest font-medium">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-sm bg-[#22c55e]" /> Open
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-sm bg-[#eab308]" /> Busy
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-sm bg-[#ef4444]" /> Over
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-sm bg-white/10" /> Closed
            </div>
          </div>
        </div>

        {/* Wait time periods */}
        <div className="space-y-2 mb-4">
          <div className="text-[9px] text-white/25 uppercase tracking-[0.2em] font-semibold">
            Queue Analysis by Period
          </div>
          {waitWindows.map((w) => {
            const colors = getUtilColor(w.utilization);
            const windowLabel = w.window === "pre_kick" ? "Pre-Kickoff"
              : w.window === "halftime" ? "Halftime Rush"
              : "4th Quarter";
            const isHalftime = w.window === "halftime";

            return (
              <div key={w.window} className="flex items-center gap-3">
                <div className={`w-24 text-[11px] font-medium truncate ${isHalftime ? "text-white/80" : "text-white/50"}`}>
                  {windowLabel}
                </div>
                <div className="flex-1 h-7 rounded-lg overflow-hidden relative" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <motion.div
                    className="h-full rounded-lg"
                    animate={{ width: `${Math.min(100, w.utilization * 100)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{
                      background: `linear-gradient(90deg, ${colors.bg}80, ${colors.bg})`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center px-3 justify-between">
                    <span className="text-[10px] font-bold text-white drop-shadow-sm tabular-nums">
                      {w.wait_minutes_band[0]}-{w.wait_minutes_band[1]} min
                    </span>
                    <div className="flex items-center gap-2">
                      {w.queue?.p_wait_gt_15 != null && w.queue.p_wait_gt_15 > 0.05 && (
                        <span className="text-[9px] text-rose-400/70">
                          SLA&gt;15m {(w.queue.p_wait_gt_15 * 100).toFixed(0)}%
                        </span>
                      )}
                      <span className="text-[10px] font-semibold tabular-nums" style={{ color: colors.bg }}>
                        {(w.utilization * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Express lanes badge */}
        {expressLanes && (
          <motion.div
            className="mb-4 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px]"
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-blue-400 font-bold">EXPRESS</span>
            <span className="text-blue-300/70">+12% throughput active</span>
          </motion.div>
        )}
      </div>

      {/* Revenue footer */}
      <div className="border-t border-white/[0.06]" style={{ background: "rgba(0,0,0,0.2)" }}>
        <div className="p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <motion.div
              className="text-xl font-bold tabular-nums"
              style={{ color: "hsl(354 78% 55%)", textShadow: "0 0 10px hsl(354 78% 55% / 0.3)" }}
              key={Math.round(revenueTotal)}
              initial={{ scale: 1.04, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              ${(animRevenue / 1000000).toFixed(2)}M
            </motion.div>
            <div className="text-[8px] text-white/25 uppercase tracking-[0.2em] font-semibold mt-0.5">Revenue</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums text-white/70">
              ${animPerCap.toFixed(2)}
            </div>
            <div className="text-[8px] text-white/25 uppercase tracking-[0.2em] font-semibold mt-0.5">Per Cap</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums" style={{ color: statusInfo.color }}>
              {animUtil.toFixed(0)}%
            </div>
            <div className="text-[8px] text-white/25 uppercase tracking-[0.2em] font-semibold mt-0.5">Peak Util</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
