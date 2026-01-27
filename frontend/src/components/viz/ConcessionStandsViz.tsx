"use client";

import { useMemo } from "react";

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

const MENU_ITEMS = [
  { name: "Hot Dog", price: 6.50, icon: "🌭", popular: true },
  { name: "Popcorn", price: 8.00, icon: "🍿", popular: true },
  { name: "Nachos", price: 9.50, icon: "🧀", popular: false },
  { name: "Soda", price: 5.50, icon: "🥤", popular: true },
  { name: "Beer", price: 12.00, icon: "🍺", popular: false },
  { name: "Pretzel", price: 7.00, icon: "🥨", popular: false },
];

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
  const utilizationPct = Math.min(200, worstUtilization * 100);
  
  // Generate stand visuals with varying utilization
  const stands = useMemo(() => {
    return Array.from({ length: standsTotal }, (_, i) => ({
      id: i,
      open: i < standsOpen,
      utilization: i < standsOpen ? Math.min(1.5, worstUtilization * (0.6 + Math.random() * 0.8)) : 0,
      staff: staffPerStand,
    }));
  }, [standsOpen, standsTotal, worstUtilization, staffPerStand]);

  const getUtilColor = (util: number) => {
    if (util > 1.0) return { bg: "#ef4444", glow: "#ef444480" };
    if (util > 0.9) return { bg: "#f59e0b", glow: "#f59e0b60" };
    if (util > 0.7) return { bg: "#eab308", glow: "#eab30840" };
    return { bg: "#22c55e", glow: "#22c55e40" };
  };

  const statusInfo = useMemo(() => {
    if (worstUtilization > 1.0) return { label: "OVERLOADED", color: "#ef4444", icon: "🚨" };
    if (worstUtilization > 0.9) return { label: "Critical", color: "#f59e0b", icon: "⚠️" };
    if (worstUtilization > 0.7) return { label: "Busy", color: "#eab308", icon: "📊" };
    return { label: "Smooth", color: "#22c55e", icon: "✅" };
  }, [worstUtilization]);

  return (
    <div className={`rounded-2xl border border-white/10 overflow-hidden ${className}`} style={{
      background: "linear-gradient(135deg, hsl(220 15% 8%) 0%, hsl(220 18% 12%) 100%)"
    }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <span className="text-lg">🏪</span>
            Concession Operations
          </div>
          <div className="text-xs text-[hsl(var(--muted-fg))]">
            {standsOpen}/{standsTotal} stands • {staffPerStand} staff each
          </div>
        </div>
        <div 
          className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
          style={{ 
            backgroundColor: `${statusInfo.color}20`,
            color: statusInfo.color,
            boxShadow: worstUtilization > 0.9 ? `0 0 12px ${statusInfo.color}40` : "none"
          }}
        >
          <span>{statusInfo.icon}</span>
          {statusInfo.label}
        </div>
      </div>

      {/* Concession stands visualization */}
      <div className="p-4">
        <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="grid grid-cols-13 gap-1">
            {stands.map((stand) => {
              const colors = getUtilColor(stand.utilization);
              return (
                <div
                  key={stand.id}
                  className="relative aspect-square rounded-sm transition-all duration-300"
                  style={{
                    background: stand.open ? "#1f2937" : "#111827",
                    boxShadow: stand.open && stand.utilization > 0.8 
                      ? `0 0 8px ${colors.glow}` 
                      : "none"
                  }}
                  title={stand.open 
                    ? `Stand ${stand.id + 1}: ${(stand.utilization * 100).toFixed(0)}% utilization` 
                    : `Stand ${stand.id + 1}: Closed`
                  }
                >
                  {stand.open && (
                    <>
                      {/* Utilization fill */}
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-b-sm transition-all duration-500"
                        style={{ 
                          height: `${Math.min(100, stand.utilization * 100)}%`,
                          background: colors.bg,
                        }}
                      />
                      {/* Overload indicator */}
                      {stand.utilization > 1.0 && (
                        <div 
                          className="absolute inset-0 rounded-sm animate-pulse"
                          style={{ background: `${colors.bg}40` }}
                        />
                      )}
                    </>
                  )}
                  {!stand.open && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-[hsl(var(--muted-fg))]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-[#22c55e]" /> Normal
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-[#eab308]" /> Busy
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-[#f59e0b]" /> Critical
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-[#ef4444]" /> Overload
            </div>
          </div>
        </div>

        {/* Wait times by period */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-semibold text-[hsl(var(--muted-fg))] uppercase tracking-wider">
            Wait Times by Period
          </div>
          {waitWindows.map((w) => {
            const colors = getUtilColor(w.utilization);
            const windowLabel = w.window === "pre_kick" ? "Pre-Kickoff" : 
                               w.window === "halftime" ? "Halftime Rush" : "4th Quarter";
            return (
              <div key={w.window} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium truncate">{windowLabel}</div>
                <div className="flex-1 h-6 rounded-full overflow-hidden relative" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, w.utilization * 100)}%`,
                      background: `linear-gradient(90deg, ${colors.bg}90, ${colors.bg})`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center px-3 justify-between">
                    <span className="text-[10px] font-bold text-white drop-shadow-sm">
                      {w.wait_minutes_band[0]}-{w.wait_minutes_band[1]} min
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: colors.bg }}>
                      {(w.utilization * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Express lanes badge */}
        {expressLanes && (
          <div className="mb-4 px-3 py-2 rounded-lg flex items-center gap-2 text-xs" 
               style={{ background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
            <span className="text-blue-400">⚡</span>
            <span className="text-blue-300 font-semibold">Express Lanes Active</span>
            <span className="text-blue-400/70 ml-auto">+12% throughput</span>
          </div>
        )}
      </div>

      {/* Menu & Revenue */}
      <div className="border-t border-white/10">
        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Menu */}
          <div>
            <div className="text-xs font-semibold text-[hsl(var(--muted-fg))] uppercase tracking-wider mb-2">
              Game Day Menu
            </div>
            <div className="space-y-1.5">
              {MENU_ITEMS.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span className="text-[hsl(var(--muted-fg))]">{item.name}</span>
                    {item.popular && (
                      <span className="px-1 py-0.5 rounded text-[8px] bg-[hsl(var(--scarlet))]/20 text-[hsl(var(--scarlet))]">
                        HOT
                      </span>
                    )}
                  </span>
                  <span className="font-mono font-semibold">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue */}
          <div className="text-right">
            <div className="text-xs font-semibold text-[hsl(var(--muted-fg))] uppercase tracking-wider mb-2">
              Revenue
            </div>
            <div className="text-3xl font-bold text-[hsl(var(--scarlet))]">
              ${(revenueTotal / 1000000).toFixed(2)}M
            </div>
            <div className="text-xs text-[hsl(var(--muted-fg))] mt-1">
              ${perCapSpend.toFixed(2)} per fan
            </div>
            <div className="mt-2 text-[10px] text-emerald-400">
              ↑ {((perCapSpend / 12) * 100 - 100).toFixed(0)}% vs avg
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
