"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Clock, AlertTriangle, Plus, Minus } from "lucide-react";

interface TimeBlock {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
  staff: number;
  utilization: number;
  demand: "low" | "medium" | "high" | "peak";
}

interface StaffingTimelineProps {
  baseStaff?: number;
  standsOpen?: number;
  waitWindows?: Array<{
    window: string;
    utilization: number;
    wait_minutes_band: [number, number];
    queue?: {
      p_wait_gt_15: number;
    };
  }>;
  onStaffChange?: (blockId: string, newStaff: number) => void;
  className?: string;
}

const DEFAULT_BLOCKS: TimeBlock[] = [
  { id: "gates_open", label: "Gates Open", startHour: 9, endHour: 10, staff: 4, utilization: 0.3, demand: "low" },
  { id: "pre_game", label: "Pre-Game", startHour: 10, endHour: 12, staff: 6, utilization: 0.6, demand: "medium" },
  { id: "kickoff", label: "Kickoff", startHour: 12, endHour: 12.25, staff: 6, utilization: 0.5, demand: "medium" },
  { id: "q1", label: "Q1", startHour: 12.25, endHour: 12.75, staff: 6, utilization: 0.65, demand: "medium" },
  { id: "q2", label: "Q2", startHour: 12.75, endHour: 13.25, staff: 6, utilization: 0.75, demand: "high" },
  { id: "halftime", label: "Halftime", startHour: 13.25, endHour: 13.75, staff: 10, utilization: 1.1, demand: "peak" },
  { id: "q3", label: "Q3", startHour: 13.75, endHour: 14.25, staff: 8, utilization: 0.7, demand: "high" },
  { id: "q4", label: "Q4", startHour: 14.25, endHour: 15, staff: 6, utilization: 0.55, demand: "medium" },
  { id: "post_game", label: "Post-Game", startHour: 15, endHour: 16, staff: 4, utilization: 0.4, demand: "low" },
];

function getUtilColor(util: number): string {
  if (util > 1.0) return "#ef4444";
  if (util > 0.9) return "#f59e0b";
  if (util > 0.7) return "#22c55e";
  return "#3b82f6";
}

function getDemandColor(demand: string): string {
  switch (demand) {
    case "peak": return "#ef4444";
    case "high": return "#f59e0b";
    case "medium": return "#3b82f6";
    default: return "#6b7280";
  }
}

export function StaffingTimeline({
  baseStaff = 6,
  standsOpen = 65,
  waitWindows = [],
  onStaffChange,
  className = "",
}: StaffingTimelineProps) {
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [staffOverrides, setStaffOverrides] = useState<Record<string, number>>({});

  // Merge wait window data with default blocks
  const blocks = useMemo(() => {
    return DEFAULT_BLOCKS.map((block) => {
      const override = staffOverrides[block.id];
      let utilization = block.utilization;
      
      // Map wait windows to blocks
      if (block.id === "pre_game" || block.id === "kickoff") {
        const ww = waitWindows.find((w) => w.window === "pre_kick");
        if (ww) utilization = ww.utilization;
      } else if (block.id === "halftime") {
        const ww = waitWindows.find((w) => w.window === "halftime");
        if (ww) utilization = ww.utilization;
      } else if (block.id === "q4") {
        const ww = waitWindows.find((w) => w.window === "q4");
        if (ww) utilization = ww.utilization;
      }

      return {
        ...block,
        staff: override ?? (block.id === "halftime" ? Math.max(baseStaff, 10) : baseStaff),
        utilization,
      };
    });
  }, [baseStaff, waitWindows, staffOverrides]);

  const totalHours = 16 - 9; // 9 AM to 4 PM
  const hourWidth = 100 / totalHours;

  const handleStaffChange = (blockId: string, delta: number) => {
    setStaffOverrides((prev) => {
      const current = prev[blockId] ?? blocks.find((b) => b.id === blockId)?.staff ?? baseStaff;
      const newValue = Math.max(2, Math.min(15, current + delta));
      return { ...prev, [blockId]: newValue };
    });
    onStaffChange?.(blockId, (staffOverrides[blockId] ?? baseStaff) + delta);
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="w-4 h-4 text-[hsl(var(--scarlet))]" />
          Staffing Timeline
        </div>
        <div className="flex items-center gap-4 text-xs text-white/50">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Low
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            High
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            Peak
          </div>
        </div>
      </div>

      {/* Time axis */}
      <div className="flex border-b border-white/10 pb-2 mb-2">
        {Array.from({ length: totalHours + 1 }, (_, i) => i + 9).map((hour) => (
          <div
            key={hour}
            className="text-[10px] text-white/40"
            style={{ width: `${hourWidth}%` }}
          >
            {hour > 12 ? `${hour - 12}PM` : hour === 12 ? "12PM" : `${hour}AM`}
          </div>
        ))}
      </div>

      {/* Timeline bars */}
      <div className="relative h-16 bg-white/5 rounded-lg overflow-hidden">
        {blocks.map((block) => {
          const left = ((block.startHour - 9) / totalHours) * 100;
          const width = ((block.endHour - block.startHour) / totalHours) * 100;
          const isHovered = hoveredBlock === block.id;

          return (
            <motion.div
              key={block.id}
              className="absolute top-2 bottom-2 rounded-lg cursor-pointer"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: getDemandColor(block.demand),
                opacity: isHovered ? 1 : 0.7,
              }}
              onMouseEnter={() => setHoveredBlock(block.id)}
              onMouseLeave={() => setHoveredBlock(null)}
              whileHover={{ scale: 1.02 }}
            >
              {width > 8 && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90">
                  {block.staff}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Utilization bar */}
      <div className="mt-2 relative h-8 bg-white/5 rounded-lg overflow-hidden">
        {blocks.map((block) => {
          const left = ((block.startHour - 9) / totalHours) * 100;
          const width = ((block.endHour - block.startHour) / totalHours) * 100;
          const barHeight = Math.min(100, block.utilization * 100);

          return (
            <div
              key={block.id}
              className="absolute bottom-0 transition-all"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                height: `${barHeight}%`,
                background: getUtilColor(block.utilization),
                opacity: 0.6,
              }}
            />
          );
        })}
        <div 
          className="absolute left-0 right-0 border-t-2 border-dashed border-white/30"
          style={{ bottom: "90%" }}
        />
        <div className="absolute right-1 top-0.5 text-[8px] text-white/30">90% target</div>
      </div>

      {/* Block labels */}
      <div className="flex mt-2">
        {blocks.map((block) => {
          const width = ((block.endHour - block.startHour) / totalHours) * 100;
          return (
            <div
              key={block.id}
              className="text-center"
              style={{ width: `${width}%` }}
            >
              <div className="text-[9px] text-white/40 truncate px-0.5">
                {block.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover detail */}
      {hoveredBlock && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10"
        >
          {(() => {
            const block = blocks.find((b) => b.id === hoveredBlock);
            if (!block) return null;

            return (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{block.label}</div>
                  <div className="text-xs text-white/50 mt-1">
                    {block.startHour > 12 ? block.startHour - 12 : block.startHour}:00 - {block.endHour > 12 ? Math.floor(block.endHour - 12) : Math.floor(block.endHour)}:{(block.endHour % 1) * 60 || "00"}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs text-white/50">Utilization</div>
                    <div 
                      className="text-lg font-bold"
                      style={{ color: getUtilColor(block.utilization) }}
                    >
                      {(block.utilization * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-white/50">Staff/Stand</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStaffChange(block.id, -1)}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-lg font-bold w-6 text-center">{block.staff}</span>
                      <button
                        onClick={() => handleStaffChange(block.id, 1)}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {block.utilization > 1.0 && (
                  <div className="flex items-center gap-1 text-rose-400 text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    Overloaded
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-xs">
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-white/50">Total Stands</div>
          <div className="text-lg font-bold">{standsOpen}</div>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-white/50">Peak Staff Needed</div>
          <div className="text-lg font-bold">{Math.max(...blocks.map((b) => b.staff)) * standsOpen}</div>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-white/50">Total Staff-Hours</div>
          <div className="text-lg font-bold">
            {blocks.reduce((acc, b) => acc + b.staff * (b.endHour - b.startHour), 0).toFixed(0)}
          </div>
        </div>
      </div>
    </div>
  );
}

