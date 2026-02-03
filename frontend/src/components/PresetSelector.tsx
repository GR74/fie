"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Zap } from "lucide-react";

export interface Preset {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  overrides: Record<string, unknown>;
}

const PRESETS: Preset[] = [
  {
    id: "max_atmosphere",
    name: "Max Atmosphere",
    description: "Maximize crowd energy and student presence for ultimate home field advantage",
    icon: "🔥",
    color: "#bb0000",
    overrides: {
      attendance: 102780,
      student_ratio: 0.26,
      crowd_energy: 95,
      stands_open_pct: 100,
      staff_per_stand: 8,
      promotion_type: "rivalry_hype",
    },
  },
  {
    id: "revenue_focus",
    name: "Revenue Focus",
    description: "Optimize concessions and premium seating for maximum revenue",
    icon: "💰",
    color: "#22c55e",
    overrides: {
      attendance: 98000,
      student_ratio: 0.18,
      crowd_energy: 70,
      stands_open_pct: 95,
      staff_per_stand: 10,
      express_lanes: true,
      promotion_type: "alumni_night",
    },
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Balance atmosphere, operations, and revenue for optimal game day",
    icon: "⚖️",
    color: "#f59e0b",
    overrides: {
      attendance: 100000,
      student_ratio: 0.22,
      crowd_energy: 80,
      stands_open_pct: 90,
      staff_per_stand: 7,
      promotion_type: "none",
    },
  },
  {
    id: "conservative",
    name: "Conservative",
    description: "Minimize operational risk with comfortable staffing levels",
    icon: "🛡️",
    color: "#6b7280",
    overrides: {
      attendance: 95000,
      student_ratio: 0.20,
      crowd_energy: 65,
      stands_open_pct: 100,
      staff_per_stand: 10,
      express_lanes: true,
      early_arrival_promo: true,
      promotion_type: "family_bundle",
    },
  },
  {
    id: "student_rush",
    name: "Student Rush",
    description: "Pack the student section for maximum noise",
    icon: "🎓",
    color: "#bb0000",
    overrides: {
      attendance: 102780,
      student_ratio: 0.30,
      crowd_energy: 100,
      stands_open_pct: 85,
      staff_per_stand: 6,
      promotion_type: "student_push",
    },
  },
  {
    id: "ops_safe",
    name: "Ops Safe",
    description: "Ensure smooth operations with no queue overloads",
    icon: "✅",
    color: "#22c55e",
    overrides: {
      attendance: 90000,
      student_ratio: 0.20,
      crowd_energy: 70,
      stands_open_pct: 100,
      staff_per_stand: 12,
      express_lanes: true,
      early_arrival_promo: true,
    },
  },
];

interface PresetSelectorProps {
  onApply: (overrides: Record<string, unknown>) => void;
  className?: string;
  hideStudentRatio?: boolean;
}

export function PresetSelector({ onApply, className = "", hideStudentRatio = false }: PresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (preset: Preset) => {
    setSelectedId(preset.id);
    if (hideStudentRatio) {
      const next = { ...preset.overrides } as Record<string, unknown>;
      delete next.student_ratio;
      onApply(next);
    } else {
      onApply(preset.overrides);
    }
    setIsOpen(false);
    
    // Reset selection indicator after animation
    setTimeout(() => setSelectedId(null), 1500);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
        style={{
          background: "linear-gradient(135deg, hsl(var(--scarlet)) 0%, hsl(354 78% 30%) 100%)",
          boxShadow: "0 4px 12px hsl(var(--scarlet) / 0.3)",
        }}
      >
        <Zap className="w-3.5 h-3.5" />
        Quick Presets
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-full left-0 mt-2 z-50 w-80 rounded-2xl border border-white/10 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(220 15% 10%) 0%, hsl(220 18% 14%) 100%)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              }}
            >
              <div className="p-3 border-b border-white/10">
                <div className="text-xs font-semibold text-white/70">Apply Scenario Preset</div>
              </div>
              
              <div className="p-2 max-h-80 overflow-y-auto">
                {PRESETS.map((preset) => (
                  <motion.button
                    key={preset.id}
                    onClick={() => handleSelect(preset)}
                    className="w-full p-3 rounded-xl text-left transition-all hover:bg-white/5 group relative"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Selection indicator */}
                    {selectedId === preset.id && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-full origin-left"
                        style={{ background: preset.color }}
                      />
                    )}
                    
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ background: `${preset.color}20` }}
                      >
                        {preset.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" style={{ color: preset.color }}>
                            {preset.name}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Hover indicator */}
                    <motion.div
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                    >
                      <div 
                        className="px-2 py-1 rounded-full text-[10px] font-semibold"
                        style={{ background: `${preset.color}30`, color: preset.color }}
                      >
                        Apply
                      </div>
                    </motion.div>
                  </motion.button>
                ))}
              </div>
              
              <div className="p-3 border-t border-white/10 text-center">
                <span className="text-[10px] text-white/40">
                  Presets override current settings
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact preset buttons for inline use
export function PresetButtons({ onApply, className = "", hideStudentRatio = false }: PresetSelectorProps) {
  const quickPresets = PRESETS.slice(0, 4); // First 4 presets
  
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {quickPresets.map((preset) => (
        <motion.button
          key={preset.id}
          onClick={() => {
            if (hideStudentRatio) {
              const next = { ...preset.overrides } as Record<string, unknown>;
              delete next.student_ratio;
              onApply(next);
            } else {
              onApply(preset.overrides);
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
          style={{
            background: `${preset.color}15`,
            border: `1px solid ${preset.color}30`,
            color: preset.color,
          }}
          whileHover={{ 
            scale: 1.02,
            background: `${preset.color}25`,
          }}
          whileTap={{ scale: 0.98 }}
        >
          <span>{preset.icon}</span>
          <span>{preset.name}</span>
        </motion.button>
      ))}
    </div>
  );
}
