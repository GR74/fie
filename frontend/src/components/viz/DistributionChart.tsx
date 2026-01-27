"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface HistogramBin {
  bin_start: number;
  bin_end: number;
  bin_center: number;
  count: number;
  frequency: number;
}

interface Stats {
  mean: number;
  std: number;
  min: number;
  max: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

interface DistributionChartProps {
  title: string;
  histogram: HistogramBin[];
  stats: Stats;
  unit?: string;
  format?: (v: number) => string;
  color?: string;
  className?: string;
}

export function DistributionChart({
  title,
  histogram,
  stats,
  unit = "",
  format = (v) => v.toFixed(2),
  color = "hsl(var(--scarlet))",
  className = "",
}: DistributionChartProps) {
  const chartData = useMemo(() => {
    return histogram.map((bin) => ({
      x: format(bin.bin_center),
      value: bin.bin_center,
      count: bin.count,
      frequency: bin.frequency * 100,
    }));
  }, [histogram, format]);

  return (
    <div className={`p-4 rounded-2xl border border-white/10 bg-white/5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-white/50 mt-0.5">
            {histogram.reduce((sum, b) => sum + b.count, 0)} simulations
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color }}>
            {format(stats.mean)}{unit}
          </div>
          <div className="text-[10px] text-white/40">
            ± {format(stats.std)}{unit}
          </div>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis
              dataKey="x"
              tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(0,0,0,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Frequency"]}
              labelFormatter={(label) => `Value: ${label}${unit}`}
            />
            <ReferenceLine
              x={format(stats.mean)}
              stroke={color}
              strokeDasharray="3 3"
              strokeWidth={2}
            />
            <Bar
              dataKey="frequency"
              fill={color}
              opacity={0.7}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Percentile bands */}
      <div className="mt-4 grid grid-cols-5 gap-2 text-center text-[10px]">
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-white/40">P5</div>
          <div className="font-mono font-semibold">{format(stats.p5)}{unit}</div>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-white/40">P25</div>
          <div className="font-mono font-semibold">{format(stats.p25)}{unit}</div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
          <div style={{ color }}>Median</div>
          <div className="font-mono font-semibold">{format(stats.p50)}{unit}</div>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-white/40">P75</div>
          <div className="font-mono font-semibold">{format(stats.p75)}{unit}</div>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-white/40">P95</div>
          <div className="font-mono font-semibold">{format(stats.p95)}{unit}</div>
        </div>
      </div>

      {/* Range indicator */}
      <div className="mt-3 relative h-2 rounded-full bg-white/10">
        <motion.div
          className="absolute top-0 bottom-0 rounded-full"
          style={{ background: color, opacity: 0.5 }}
          initial={{ left: "0%", right: "100%" }}
          animate={{
            left: `${((stats.p5 - stats.min) / (stats.max - stats.min)) * 100}%`,
            right: `${100 - ((stats.p95 - stats.min) / (stats.max - stats.min)) * 100}%`,
          }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="absolute w-2 h-2 rounded-full -mt-0 bg-white"
          style={{ boxShadow: `0 0 6px ${color}` }}
          initial={{ left: "50%" }}
          animate={{
            left: `${((stats.p50 - stats.min) / (stats.max - stats.min)) * 100}%`,
          }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-white/30 mt-1">
        <span>{format(stats.min)}{unit}</span>
        <span>{format(stats.max)}{unit}</span>
      </div>
    </div>
  );
}

// Summary component for Monte Carlo results
interface MonteCarloSummaryProps {
  winProbability: { stats: Stats; histogram: HistogramBin[] };
  decibels: { stats: Stats; histogram: HistogramBin[] };
  revenue: { stats: Stats; histogram: HistogramBin[] };
  utilization: { stats: Stats; histogram: HistogramBin[] };
  nSimulations: number;
  className?: string;
}

export function MonteCarloSummary({
  winProbability,
  decibels,
  revenue,
  utilization,
  nSimulations,
  className = "",
}: MonteCarloSummaryProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Monte Carlo Simulation</h2>
        <span className="text-xs text-white/50">{nSimulations} runs</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DistributionChart
          title="Win Probability"
          histogram={winProbability.histogram}
          stats={winProbability.stats}
          format={(v) => (v * 100).toFixed(1)}
          unit="%"
          color="#bb0000"
        />
        <DistributionChart
          title="Stadium Noise"
          histogram={decibels.histogram}
          stats={decibels.stats}
          format={(v) => v.toFixed(1)}
          unit=" dB"
          color="#22c55e"
        />
        <DistributionChart
          title="Revenue"
          histogram={revenue.histogram}
          stats={revenue.stats}
          format={(v) => `$${(v / 1000000).toFixed(2)}M`}
          unit=""
          color="#f59e0b"
        />
        <DistributionChart
          title="Ops Utilization"
          histogram={utilization.histogram}
          stats={utilization.stats}
          format={(v) => (v * 100).toFixed(0)}
          unit="%"
          color="#3b82f6"
        />
      </div>
    </div>
  );
}

