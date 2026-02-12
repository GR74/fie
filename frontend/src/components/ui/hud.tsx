"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export function HudDivider({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "h-px w-full",
        "bg-gradient-to-r from-transparent via-white/20 to-transparent",
        className,
      )}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
  );
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

export function StatBar({
  label,
  value,
  sub,
  tone = "scarlet",
  numericValue,
  maxValue = 100,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "scarlet" | "neutral" | "good" | "bad";
  numericValue?: number;
  maxValue?: number;
}) {
  const fillPct = numericValue != null ? Math.min(100, (numericValue / maxValue) * 100) : 50;
  const animFill = useAnimatedNumber(fillPct);

  const toneColors = {
    scarlet: {
      gradient: "from-[hsl(354,78%,55%)] to-[hsl(354,78%,35%)]",
      glow: "hsl(354 78% 55% / 0.3)",
      text: "text-[hsl(354,78%,55%)]",
      border: "border-[hsl(354,78%,55%)]/20",
      bg: "hsl(354 78% 55%)",
    },
    good: {
      gradient: "from-emerald-400 to-emerald-600",
      glow: "rgba(52,211,153,0.25)",
      text: "text-emerald-400",
      border: "border-emerald-400/20",
      bg: "#34d399",
    },
    bad: {
      gradient: "from-rose-400 to-rose-600",
      glow: "rgba(251,113,133,0.25)",
      text: "text-rose-400",
      border: "border-rose-400/20",
      bg: "#fb7185",
    },
    neutral: {
      gradient: "from-white/50 to-white/20",
      glow: "rgba(255,255,255,0.1)",
      text: "text-white/70",
      border: "border-white/10",
      bg: "rgba(255,255,255,0.5)",
    },
  };

  const colors = toneColors[tone];

  return (
    <motion.div
      className={cn(
        "relative rounded-2xl border overflow-hidden p-4",
        colors.border,
      )}
      style={{
        background: "linear-gradient(135deg, hsl(220 18% 8%) 0%, hsl(224 16% 11%) 100%)",
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Subtle top accent line */}
      <div
        className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", colors.gradient)}
        style={{ boxShadow: `0 0 10px ${colors.glow}` }}
      />

      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold">
        {label}
      </div>
      <motion.div
        className={cn("mt-1.5 text-3xl font-bold tabular-nums leading-none tracking-tight", colors.text)}
        key={value}
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{ textShadow: `0 0 12px ${colors.glow}` }}
      >
        {value}
      </motion.div>
      {sub && <div className="mt-1.5 text-[11px] text-white/30">{sub}</div>}

      {/* Animated fill bar */}
      <div className="mt-3 h-[3px] w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", colors.gradient)}
          animate={{ width: `${animFill}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ boxShadow: `0 0 6px ${colors.glow}` }}
        />
      </div>
    </motion.div>
  );
}
