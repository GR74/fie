"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

interface LiveMetricCardProps {
  label: string;
  value: string | number;
  previousValue?: string | number;
  unit?: string;
  status?: "good" | "warning" | "critical" | "neutral";
  trend?: "up" | "down" | "flat";
  icon?: React.ReactNode;
  className?: string;
}

export function LiveMetricCard({
  label,
  value,
  previousValue,
  unit,
  status = "neutral",
  trend,
  icon,
  className = "",
}: LiveMetricCardProps) {
  const statusColors = {
    good: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
    critical: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400" },
    neutral: { bg: "bg-white/5", border: "border-white/10", text: "text-white" },
  };

  const colors = statusColors[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border ${colors.bg} ${colors.border} p-4 ${className}`}
    >
      {/* Pulse effect for critical status */}
      {status === "critical" && (
        <motion.div
          className="absolute inset-0 bg-rose-500/10"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          {label}
        </span>
        {icon && <div className="text-white/30">{icon}</div>}
      </div>

      {/* Value */}
      <motion.div
        key={String(value)}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`text-3xl font-bold ${colors.text}`}
      >
        {value}
        {unit && <span className="text-lg ml-1 text-white/50">{unit}</span>}
      </motion.div>

      {/* Trend & Previous */}
      <div className="flex items-center justify-between mt-2">
        {previousValue !== undefined && (
          <span className="text-xs text-white/40">
            Prev: {previousValue}{unit}
          </span>
        )}
        
        {trend && (
          <div className={`flex items-center gap-1 ${
            trend === "up" ? "text-emerald-400" :
            trend === "down" ? "text-rose-400" :
            "text-white/40"
          }`}>
            {trend === "up" && <TrendingUp className="w-4 h-4" />}
            {trend === "down" && <TrendingDown className="w-4 h-4" />}
            {trend === "flat" && <Minus className="w-4 h-4" />}
          </div>
        )}
      </div>

      {/* Status indicator */}
      {status === "critical" && (
        <div className="absolute top-2 right-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
        </div>
      )}
    </motion.div>
  );
}

// Compact version for grids
export function LiveMetricCompact({
  label,
  value,
  status = "neutral",
  className = "",
}: {
  label: string;
  value: string | number;
  status?: "good" | "warning" | "critical" | "neutral";
  className?: string;
}) {
  const statusColors = {
    good: "text-emerald-400",
    warning: "text-amber-400",
    critical: "text-rose-400",
    neutral: "text-white",
  };

  return (
    <div className={`text-center ${className}`}>
      <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">{label}</div>
      <motion.div
        key={String(value)}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        className={`text-xl font-bold ${statusColors[status]}`}
      >
        {value}
      </motion.div>
    </div>
  );
}

