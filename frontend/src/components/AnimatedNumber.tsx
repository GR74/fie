"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 0.8,
  format = (v) => v.toFixed(0),
  className = "",
}: AnimatedNumberProps) {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => format(current));
  const [displayValue, setDisplayValue] = useState(format(value));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [display]);

  return <span className={className}>{displayValue}</span>;
}

// Percentage with counting animation
export function AnimatedPercent({
  value,
  decimals = 1,
  className = "",
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  return (
    <AnimatedNumber
      value={value * 100}
      format={(v) => `${v.toFixed(decimals)}%`}
      className={className}
    />
  );
}

// Currency with counting animation
export function AnimatedCurrency({
  value,
  compact = false,
  className = "",
}: {
  value: number;
  compact?: boolean;
  className?: string;
}) {
  const format = (v: number) => {
    if (compact) {
      if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
      if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    }
    return v.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  };

  return <AnimatedNumber value={value} format={format} className={className} />;
}

// Decibels with counting animation
export function AnimatedDecibels({
  value,
  decimals = 1,
  className = "",
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  return (
    <AnimatedNumber
      value={value}
      format={(v) => `${v.toFixed(decimals)} dB`}
      className={className}
    />
  );
}

// Delta indicator with color and arrow
export function AnimatedDelta({
  value,
  format = "pp",
  className = "",
}: {
  value: number;
  format?: "pp" | "pct" | "number";
  className?: string;
}) {
  const formatFn = (v: number) => {
    const sign = v >= 0 ? "+" : "";
    switch (format) {
      case "pp":
        return `${sign}${(v * 100).toFixed(2)}pp`;
      case "pct":
        return `${sign}${(v * 100).toFixed(1)}%`;
      default:
        return `${sign}${v.toFixed(2)}`;
    }
  };

  return (
    <motion.span
      key={value > 0 ? "positive" : value < 0 ? "negative" : "neutral"}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`font-semibold ${
        value > 0 ? "text-emerald-400" : value < 0 ? "text-rose-400" : "text-white/50"
      } ${className}`}
    >
      <AnimatedNumber value={value} format={formatFn} />
    </motion.span>
  );
}

// Progress bar with animation
export function AnimatedProgress({
  value,
  max = 100,
  color = "hsl(var(--scarlet))",
  height = 8,
  className = "",
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  className?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div
      className={`rounded-full overflow-hidden bg-white/10 ${className}`}
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

