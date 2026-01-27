"use client";

import { motion } from "framer-motion";

interface PerformanceGaugesProps {
  winProbability: number;
  winProbabilityBaseline: number;
  winProbabilityDelta: number;
  decibels: number;
  decibelsBaseline: number;
  crowdEnergy: number;
  opsUtilization: number;
  className?: string;
}

function CircularGauge({
  value,
  max,
  label,
  unit,
  color,
  baseline,
  size = 100,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  baseline?: number;
  size?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const baselinePct = baseline != null ? Math.min(100, (baseline / max) * 100) : null;
  const delta = baseline != null ? value - baseline : null;
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(pct / 100) * circumference * 0.75} ${circumference}`;
  const baselineStrokeDasharray = baselinePct != null 
    ? `${(baselinePct / 100) * circumference * 0.75} ${circumference}` 
    : undefined;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[135deg]">
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-white/10"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
          />
          
          {/* Baseline indicator */}
          {baselineStrokeDasharray && (
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-white/25"
              strokeDasharray={baselineStrokeDasharray}
            />
          )}
          
          {/* Value arc */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            style={{
              filter: `drop-shadow(0 0 6px ${color}80)`,
              transition: "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          
          {/* Tick marks */}
          {[...Array(8)].map((_, i) => {
            const tickAngle = (i / 7) * 270 - 45;
            const rad = (tickAngle * Math.PI) / 180;
            const x1 = 50 + Math.cos(rad) * 32;
            const y1 = 50 + Math.sin(rad) * 32;
            const x2 = 50 + Math.cos(rad) * 35;
            const y2 = 50 + Math.sin(rad) * 35;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="white"
                strokeWidth="1"
                opacity="0.3"
              />
            );
          })}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-bold" style={{ color }}>
            {value.toFixed(1)}
          </div>
          <div className="text-[9px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">
            {unit}
          </div>
        </div>
      </div>
      
      <div className="mt-1 text-xs font-semibold">{label}</div>
      
      {delta != null && delta !== 0 && (
        <div className={`text-[10px] font-semibold flex items-center gap-0.5 ${
          delta > 0 ? "text-emerald-400" : "text-rose-400"
        }`}>
          <span>{delta > 0 ? "▲" : "▼"}</span>
          <span>{Math.abs(delta).toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

function VerticalBar({
  value,
  max,
  label,
  thresholds,
}: {
  value: number;
  max: number;
  label: string;
  thresholds: { value: number; color: string; label: string }[];
}) {
  const pct = Math.min(100, (value / max) * 100);
  
  let color = thresholds[0]?.color || "#22c55e";
  let status = thresholds[0]?.label || "";
  for (const t of thresholds) {
    if (value >= t.value) {
      color = t.color;
      status = t.label;
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-semibold mb-2">{label}</div>
      
      <div className="relative w-10 h-20 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        {/* Threshold markers */}
        {thresholds.slice(1).map((t, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px"
            style={{ 
              bottom: `${(t.value / max) * 100}%`,
              background: `${t.color}40`
            }}
          />
        ))}
        
        {/* Fill */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-700"
          style={{
            height: `${pct}%`,
            background: `linear-gradient(to top, ${color}, ${color}cc)`,
            boxShadow: `0 0 16px ${color}60, inset 0 2px 4px rgba(255,255,255,0.2)`,
          }}
        />
        
        {/* Shine effect */}
        <div className="absolute inset-x-1 top-0 bottom-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      
      <div className="mt-2 text-sm font-bold" style={{ color }}>
        {value.toFixed(0)}
      </div>
      <div className="text-[9px] text-[hsl(var(--muted-fg))]">{status}</div>
    </div>
  );
}

export function PerformanceGauges({
  winProbability,
  winProbabilityBaseline,
  winProbabilityDelta,
  decibels,
  decibelsBaseline,
  crowdEnergy,
  opsUtilization,
  className = "",
}: PerformanceGaugesProps) {
  const winColor = winProbability >= 0.7 ? "#bb0000" : winProbability >= 0.5 ? "#f59e0b" : "#6b7280";
  const dbColor = decibels >= 110 ? "#bb0000" : decibels >= 100 ? "#f59e0b" : "#6b7280";
  
  // Overall performance score
  const perfScore = (
    (winProbabilityDelta > 0 ? 25 : 0) +
    (winProbabilityDelta > 0.02 ? 25 : 0) +
    (crowdEnergy >= 75 ? 25 : crowdEnergy >= 50 ? 15 : 0) +
    (opsUtilization <= 0.9 ? 25 : opsUtilization <= 1.0 ? 15 : 0)
  );
  
  const perfStatus = perfScore >= 75 ? { label: "ELITE", color: "#bb0000", icon: "🔥" } :
                     perfScore >= 50 ? { label: "STRONG", color: "#22c55e", icon: "✅" } :
                     perfScore >= 25 ? { label: "AVERAGE", color: "#f59e0b", icon: "📊" } :
                     { label: "NEEDS WORK", color: "#ef4444", icon: "⚠️" };

  return (
    <div className={`rounded-2xl border border-white/10 overflow-hidden ${className}`} style={{
      background: "linear-gradient(135deg, hsl(220 15% 8%) 0%, hsl(220 18% 12%) 100%)"
    }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <span className="text-lg">📊</span>
            Performance Dashboard
          </div>
          <div className="text-xs text-[hsl(var(--muted-fg))]">
            Real-time game day metrics
          </div>
        </div>
        <div 
          className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
          style={{ 
            backgroundColor: `${perfStatus.color}20`,
            color: perfStatus.color,
          }}
        >
          <span>{perfStatus.icon}</span>
          {perfStatus.label}
        </div>
      </div>

      {/* Gauges */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2">
          <CircularGauge
            value={winProbability * 100}
            max={100}
            label="Win Prob"
            unit="%"
            color={winColor}
            baseline={winProbabilityBaseline * 100}
            size={90}
          />
          
          <CircularGauge
            value={decibels}
            max={120}
            label="Loudness"
            unit="dB"
            color={dbColor}
            baseline={decibelsBaseline}
            size={90}
          />
          
          <VerticalBar
            value={crowdEnergy}
            max={100}
            label="Energy"
            thresholds={[
              { value: 0, color: "#6b7280", label: "Low" },
              { value: 40, color: "#eab308", label: "Rising" },
              { value: 65, color: "#22c55e", label: "High" },
              { value: 85, color: "#bb0000", label: "ELECTRIC" },
            ]}
          />
          
          <VerticalBar
            value={opsUtilization * 100}
            max={150}
            label="Ops Load"
            thresholds={[
              { value: 0, color: "#22c55e", label: "Smooth" },
              { value: 70, color: "#eab308", label: "Active" },
              { value: 90, color: "#f59e0b", label: "Stressed" },
              { value: 100, color: "#ef4444", label: "CRITICAL" },
            ]}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-t border-white/10" style={{ background: "rgba(0,0,0,0.2)" }}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={`text-lg font-bold ${winProbabilityDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {winProbabilityDelta >= 0 ? "+" : ""}{(winProbabilityDelta * 100).toFixed(2)}pp
            </div>
            <div className="text-[9px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">
              Win Δ
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-[hsl(var(--scarlet))]">
              {crowdEnergy}/100
            </div>
            <div className="text-[9px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">
              Crowd
            </div>
          </div>
          <div>
            <div className={`text-lg font-bold ${opsUtilization <= 0.9 ? "text-emerald-400" : opsUtilization <= 1.0 ? "text-amber-400" : "text-rose-400"}`}>
              {(opsUtilization * 100).toFixed(0)}%
            </div>
            <div className="text-[9px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">
              Ops
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
