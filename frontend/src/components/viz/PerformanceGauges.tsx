"use client";

import { useMemo, useEffect, useState, useRef } from "react";
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

// Smooth animated number
function useAnimatedNumber(target: number, duration = 600) {
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
      const current = start + (end - start) * eased;
      setValue(current);
      if (t < 1) requestAnimationFrame(tick);
      else ref.current = end;
    }
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

// Arc gauge with neon glow, needle, and animated sweep
function ArcGauge({
  value,
  max,
  label,
  unit,
  color,
  glowColor,
  baseline,
  format,
  size = 140,
  sweepDeg = 240,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  glowColor: string;
  baseline?: number;
  format?: (v: number) => string;
  size?: number;
  sweepDeg?: number;
}) {
  const animVal = useAnimatedNumber(value);
  const pct = Math.min(1, animVal / max);
  const baselinePct = baseline != null ? Math.min(1, baseline / max) : null;
  const delta = baseline != null ? value - baseline : null;

  const r = 42;
  const circumference = 2 * Math.PI * r;
  const startAngle = (360 - sweepDeg) / 2 + 90; // Start from bottom-left
  const arcLength = (sweepDeg / 360) * circumference;

  const valueDash = `${pct * arcLength} ${circumference}`;
  const baselineDash = baselinePct != null ? `${baselinePct * arcLength} ${circumference}` : undefined;
  const trackDash = `${arcLength} ${circumference}`;

  // Needle angle
  const needleAngle = startAngle + pct * sweepDeg;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLen = 32;
  const nx = 50 + Math.cos(needleRad) * needleLen;
  const ny = 50 + Math.sin(needleRad) * needleLen;

  const displayValue = format ? format(animVal) : animVal.toFixed(1);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: `rotate(${startAngle}deg)` }}>
          <defs>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor={glowColor} floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={trackDash}
          />

          {/* Tick marks */}
          {Array.from({ length: 9 }).map((_, i) => {
            const tickPct = i / 8;
            const angle = tickPct * sweepDeg;
            const rad = (angle * Math.PI) / 180;
            const inner = r - 5;
            const outer = r - 2;
            return (
              <line
                key={i}
                x1={50 + Math.cos(rad) * inner}
                y1={50 + Math.sin(rad) * inner}
                x2={50 + Math.cos(rad) * outer}
                y2={50 + Math.sin(rad) * outer}
                stroke={tickPct <= pct ? color : "rgba(255,255,255,0.15)"}
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity={tickPct <= pct ? 0.8 : 0.4}
              />
            );
          })}

          {/* Baseline ghost arc */}
          {baselineDash && (
            <circle
              cx="50" cy="50" r={r}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={baselineDash}
            />
          )}

          {/* Value arc with glow */}
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={valueDash}
            filter={`url(#glow-${label})`}
            style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />

          {/* Needle */}
          <line
            x1="50" y1="50"
            x2={nx} y2={ny}
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="50" cy="50" r="3" fill={color} opacity="0.5" />
          <circle cx="50" cy="50" r="1.5" fill="white" opacity="0.8" />
        </svg>

        {/* Center readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: "4px" }}>
          <div className="text-[22px] font-bold tabular-nums leading-none" style={{ color, textShadow: `0 0 12px ${glowColor}` }}>
            {displayValue}
          </div>
          <div className="text-[8px] text-white/35 uppercase tracking-[0.15em] font-semibold mt-0.5">
            {unit}
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="mt-0.5 text-[11px] font-semibold text-white/70">{label}</div>

      {/* Delta indicator */}
      {delta != null && Math.abs(delta) > 0.001 && (
        <motion.div
          className={`text-[10px] font-bold flex items-center gap-0.5 mt-0.5 ${delta > 0 ? "text-emerald-400" : "text-rose-400"}`}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          key={delta.toFixed(3)}
        >
          <span>{delta > 0 ? "+" : ""}{delta.toFixed(1)}</span>
        </motion.div>
      )}
    </div>
  );
}

// Vertical bar with animated fill and threshold zones
function TelemetryBar({
  value,
  max,
  label,
  thresholds,
}: {
  value: number;
  max: number;
  label: string;
  thresholds: Array<{ value: number; color: string; label: string }>;
}) {
  const animVal = useAnimatedNumber(value);
  const pct = Math.min(100, (animVal / max) * 100);

  let color = thresholds[0]?.color || "#22c55e";
  let status = thresholds[0]?.label || "";
  for (const t of thresholds) {
    if (value >= t.value) { color = t.color; status = t.label; }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-[11px] font-semibold text-white/70 mb-2">{label}</div>

      <div className="relative w-8 h-24 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        {/* Threshold markers */}
        {thresholds.slice(1).map((t, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px"
            style={{ bottom: `${(t.value / max) * 100}%`, background: `${t.color}30` }}
          />
        ))}

        {/* Fill with gradient */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            background: `linear-gradient(to top, ${color}, ${color}cc)`,
            boxShadow: `0 0 14px ${color}50, inset 0 1px 3px rgba(255,255,255,0.15)`,
          }}
        />

        {/* Shine */}
        <div className="absolute inset-x-1 top-0 bottom-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent rounded-full" />
      </div>

      <div className="mt-2 text-sm font-bold tabular-nums" style={{ color, textShadow: `0 0 8px ${color}40` }}>
        {Math.round(animVal)}
      </div>
      <div className="text-[8px] text-white/35 uppercase tracking-widest font-semibold">{status}</div>
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
  const winGlow = winProbability >= 0.7 ? "#bb000080" : winProbability >= 0.5 ? "#f59e0b60" : "#6b728040";
  const dbColor = decibels >= 110 ? "#bb0000" : decibels >= 100 ? "#f59e0b" : "#6b7280";
  const dbGlow = decibels >= 110 ? "#bb000080" : decibels >= 100 ? "#f59e0b60" : "#6b728040";

  const perfScore = (
    (winProbabilityDelta > 0 ? 25 : 0) +
    (winProbabilityDelta > 0.02 ? 25 : 0) +
    (crowdEnergy >= 75 ? 25 : crowdEnergy >= 50 ? 15 : 0) +
    (opsUtilization <= 0.9 ? 25 : opsUtilization <= 1.0 ? 15 : 0)
  );

  const perfStatus = perfScore >= 75 ? { label: "ELITE", color: "#bb0000", glow: "hsl(354 78% 50% / 0.3)" } :
                     perfScore >= 50 ? { label: "STRONG", color: "#22c55e", glow: "hsl(140 60% 45% / 0.2)" } :
                     perfScore >= 25 ? { label: "AVERAGE", color: "#f59e0b", glow: "hsl(40 90% 50% / 0.2)" } :
                     { label: "NEEDS WORK", color: "#ef4444", glow: "hsl(0 80% 50% / 0.2)" };

  return (
    <motion.div
      className={`rounded-2xl border border-white/[0.08] overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{
        background: "linear-gradient(150deg, hsl(220 18% 6%) 0%, hsl(222 16% 10%) 50%, hsl(220 14% 7%) 100%)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white/90">Performance Telemetry</div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest font-medium mt-0.5">
            Real-time game day metrics
          </div>
        </div>
        <motion.div
          className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
          style={{
            backgroundColor: `${perfStatus.color}15`,
            color: perfStatus.color,
            boxShadow: `0 0 16px ${perfStatus.glow}`,
            border: `1px solid ${perfStatus.color}25`,
          }}
          animate={{ boxShadow: [`0 0 12px ${perfStatus.glow}`, `0 0 24px ${perfStatus.glow}`, `0 0 12px ${perfStatus.glow}`] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {perfStatus.label}
        </motion.div>
      </div>

      {/* Gauges */}
      <div className="p-4 pb-2">
        <div className="grid grid-cols-4 gap-1 items-end">
          <ArcGauge
            value={winProbability * 100}
            max={100}
            label="Win Prob"
            unit="percent"
            color={winColor}
            glowColor={winGlow}
            baseline={winProbabilityBaseline * 100}
            format={(v) => `${v.toFixed(1)}%`}
            size={130}
          />

          <ArcGauge
            value={decibels}
            max={120}
            label="Loudness"
            unit="decibels"
            color={dbColor}
            glowColor={dbGlow}
            baseline={decibelsBaseline}
            format={(v) => v.toFixed(1)}
            size={130}
          />

          <TelemetryBar
            value={crowdEnergy}
            max={100}
            label="Energy"
            thresholds={[
              { value: 0, color: "#6b7280", label: "Low" },
              { value: 40, color: "#eab308", label: "Rising" },
              { value: 65, color: "#22c55e", label: "High" },
              { value: 85, color: "#bb0000", label: "Electric" },
            ]}
          />

          <TelemetryBar
            value={opsUtilization * 100}
            max={150}
            label="Ops Load"
            thresholds={[
              { value: 0, color: "#22c55e", label: "Smooth" },
              { value: 70, color: "#eab308", label: "Active" },
              { value: 90, color: "#f59e0b", label: "Stressed" },
              { value: 100, color: "#ef4444", label: "Critical" },
            ]}
          />
        </div>
      </div>

      {/* Bottom summary strip */}
      <div className="px-4 py-3 border-t border-white/[0.06]" style={{ background: "rgba(0,0,0,0.2)" }}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <motion.div
              className={`text-lg font-bold tabular-nums ${winProbabilityDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}
              key={winProbabilityDelta.toFixed(3)}
              initial={{ scale: 1.1, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {winProbabilityDelta >= 0 ? "+" : ""}{(winProbabilityDelta * 100).toFixed(2)}pp
            </motion.div>
            <div className="text-[8px] text-white/25 uppercase tracking-[0.2em] font-semibold">Win Delta</div>
          </div>
          <div>
            <div className="text-lg font-bold tabular-nums" style={{ color: "hsl(354 78% 55%)" }}>
              {crowdEnergy}/100
            </div>
            <div className="text-[8px] text-white/25 uppercase tracking-[0.2em] font-semibold">Crowd</div>
          </div>
          <div>
            <div className={`text-lg font-bold tabular-nums ${opsUtilization <= 0.9 ? "text-emerald-400" : opsUtilization <= 1.0 ? "text-amber-400" : "text-rose-400"}`}>
              {(opsUtilization * 100).toFixed(0)}%
            </div>
            <div className="text-[8px] text-white/25 uppercase tracking-[0.2em] font-semibold">Ops</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
