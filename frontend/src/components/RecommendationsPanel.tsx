"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, TrendingUp, AlertTriangle, Zap, ChevronRight } from "lucide-react";
import type { SimulateOverrides } from "@/lib/api";

interface Recommendation {
  id: string;
  type: "opportunity" | "warning" | "optimization";
  title: string;
  description: string;
  impact: string;
  suggestedAction?: Partial<SimulateOverrides>;
  priority: "high" | "medium" | "low";
}

interface RecommendationsPanelProps {
  currentOverrides: SimulateOverrides;
  baselineAttendance: number;
  baselineStudentRatio?: number;
  currentWinProb: number;
  baselineWinProb: number;
  opsUtilization: number;
  crowdEnergy: number;
  decibels: number;
  onApply: (overrides: Partial<SimulateOverrides>) => void;
  className?: string;
  showStudentRatio?: boolean;
}

function generateRecommendations(
  props: Omit<RecommendationsPanelProps, "onApply" | "className">
): Recommendation[] {
  const {
    currentOverrides,
    baselineAttendance,
    baselineStudentRatio,
    currentWinProb,
    baselineWinProb,
    opsUtilization,
    crowdEnergy,
    decibels,
    showStudentRatio = true,
  } = props;

  const recommendations: Recommendation[] = [];
  const attendance = currentOverrides.attendance ?? baselineAttendance;
  const studentRatio = showStudentRatio
    ? currentOverrides.student_ratio ?? baselineStudentRatio ?? 0
    : 0;
  const staffPerStand = currentOverrides.staff_per_stand ?? 6;

  // Win probability opportunities
  if (currentWinProb < 0.75) {
    if (crowdEnergy < 85) {
      recommendations.push({
        id: "boost-energy",
        type: "opportunity",
        title: "Boost Crowd Energy",
        description: `Increasing crowd energy from ${crowdEnergy} to 90+ could add ~0.8pp to win probability.`,
        impact: "+0.5–1.0pp win prob",
        suggestedAction: { crowd_energy: 90 },
        priority: "high",
      });
    }

    if (showStudentRatio && studentRatio < 0.25) {
      recommendations.push({
        id: "increase-students",
        type: "opportunity",
        title: "Increase Student Section",
        description: `Student ratio is ${(studentRatio * 100).toFixed(1)}%. Targeting 25%+ maximizes atmosphere.`,
        impact: "+0.3–0.5pp win prob",
        suggestedAction: { student_ratio: 0.25 },
        priority: "medium",
      });
    }
  }

  // Operations warnings
  if (opsUtilization > 1.0) {
    recommendations.push({
      id: "critical-ops",
      type: "warning",
      title: "Critical: Concessions Overloaded",
      description: `Utilization at ${(opsUtilization * 100).toFixed(0)}% will cause long wait times and lost revenue.`,
      impact: "Risk of customer complaints",
      suggestedAction: { staff_per_stand: Math.min(12, staffPerStand + 4), stands_open_pct: 100 },
      priority: "high",
    });
  } else if (opsUtilization > 0.9) {
    recommendations.push({
      id: "busy-ops",
      type: "warning",
      title: "High Ops Load",
      description: `At ${(opsUtilization * 100).toFixed(0)}% utilization, halftime will be stressed.`,
      impact: "10-15 min wait times",
      suggestedAction: { staff_per_stand: staffPerStand + 2 },
      priority: "medium",
    });
  }

  // Optimization suggestions
  if (attendance < baselineAttendance * 0.95 && currentWinProb > 0.6) {
    recommendations.push({
      id: "fill-stadium",
      type: "optimization",
      title: "Fill the Stadium",
      description: `You have ${(baselineAttendance - attendance).toLocaleString()} empty seats. A full house adds atmosphere.`,
      impact: "+0.2pp win prob, +$50K revenue",
      suggestedAction: { attendance: baselineAttendance },
      priority: "medium",
    });
  }

  if (decibels < 105 && crowdEnergy < 90) {
    recommendations.push({
      id: "noise-target",
      type: "optimization",
      title: "Target 110 dB",
      description: "Stadium noise below 105 dB. Push energy to create a hostile environment.",
      impact: "Better crowd intimidation",
      suggestedAction: { crowd_energy: 95 },
      priority: "low",
    });
  }

  // Express lanes suggestion
  if (opsUtilization > 0.7 && !currentOverrides.express_lanes) {
    recommendations.push({
      id: "express-lanes",
      type: "optimization",
      title: "Enable Express Lanes",
      description: "Express lanes can reduce wait times by 12% during peak periods.",
      impact: "-2 min avg wait time",
      suggestedAction: { express_lanes: true },
      priority: "medium",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export function RecommendationsPanel(props: RecommendationsPanelProps) {
  const { onApply, className = "" } = props;
  
  const recommendations = useMemo(
    () => generateRecommendations(props),
    [props.currentOverrides, props.baselineAttendance, props.baselineStudentRatio, 
     props.currentWinProb, props.baselineWinProb, props.opsUtilization, 
     props.crowdEnergy, props.decibels, props.showStudentRatio]
  );

  const getIcon = (type: string) => {
    switch (type) {
      case "opportunity": return <TrendingUp className="w-4 h-4" />;
      case "warning": return <AlertTriangle className="w-4 h-4" />;
      case "optimization": return <Zap className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getColors = (type: string, priority: string) => {
    if (type === "warning") {
      return priority === "high"
        ? { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400" }
        : { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" };
    }
    if (type === "opportunity") {
      return { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" };
    }
    return { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" };
  };

  if (recommendations.length === 0) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-white/50">
          <Lightbulb className="w-4 h-4" />
          <span className="text-sm">No recommendations - your setup looks optimal!</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
        <Lightbulb className="w-4 h-4 text-[hsl(var(--scarlet))]" />
        AI Recommendations
        <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">
          {recommendations.length}
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {recommendations.map((rec, index) => {
          const colors = getColors(rec.type, rec.priority);
          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-xl border p-3 ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${colors.text}`}>
                  {getIcon(rec.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{rec.title}</span>
                    {rec.priority === "high" && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10">
                        HIGH
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">{rec.description}</p>
                  <div className={`text-xs font-semibold mt-1 ${colors.text}`}>
                    {rec.impact}
                  </div>
                </div>
                {rec.suggestedAction && (
                  <button
                    onClick={() => onApply(rec.suggestedAction!)}
                    className={`shrink-0 px-2 py-1 rounded-lg text-xs font-semibold transition hover:bg-white/10 flex items-center gap-1 ${colors.text}`}
                  >
                    Apply
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
