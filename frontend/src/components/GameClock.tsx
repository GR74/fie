"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";

interface GameClockProps {
  initialMinutes?: number;
  quarter?: number;
  onQuarterChange?: (quarter: number) => void;
  onTimeChange?: (minutes: number, seconds: number) => void;
  className?: string;
}

const QUARTER_NAMES = ["", "1st Quarter", "2nd Quarter", "Halftime", "3rd Quarter", "4th Quarter", "Final"];

export function GameClock({
  initialMinutes = 15,
  quarter = 1,
  onQuarterChange,
  onTimeChange,
  className = "",
}: GameClockProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentQuarter, setCurrentQuarter] = useState(quarter);
  const [timeRemaining, setTimeRemaining] = useState(initialMinutes * 60); // in seconds

  useEffect(() => {
    if (!isRunning || currentQuarter === 3 || currentQuarter === 6) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          // Quarter ended
          const nextQuarter = currentQuarter + 1;
          setCurrentQuarter(nextQuarter);
          onQuarterChange?.(nextQuarter);
          
          if (nextQuarter === 3) {
            // Halftime
            setIsRunning(false);
            return 0;
          } else if (nextQuarter === 6) {
            // Game over
            setIsRunning(false);
            return 0;
          }
          return initialMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, currentQuarter, initialMinutes, onQuarterChange]);

  useEffect(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    onTimeChange?.(minutes, seconds);
  }, [timeRemaining, onTimeChange]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentQuarter(1);
    setTimeRemaining(initialMinutes * 60);
    onQuarterChange?.(1);
  };

  const handleQuarterClick = (q: number) => {
    setCurrentQuarter(q);
    setTimeRemaining(q === 3 || q === 6 ? 0 : initialMinutes * 60);
    onQuarterChange?.(q);
  };

  const isHalftime = currentQuarter === 3;
  const isFinal = currentQuarter === 6;

  return (
    <div className={`text-center ${className}`}>
      {/* Quarter indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((q) => {
          const isActive = q === currentQuarter || (q === 3 && currentQuarter === 3);
          const label = q === 3 ? "HT" : q > 3 ? `Q${q - 1}` : `Q${q}`;
          return (
            <button
              key={q}
              onClick={() => handleQuarterClick(q)}
              className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                isActive
                  ? "bg-[hsl(var(--scarlet))] text-white shadow-lg shadow-[hsl(var(--scarlet))]/30"
                  : q < currentQuarter
                  ? "bg-white/20 text-white/70"
                  : "bg-white/5 text-white/30 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Main clock display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isHalftime ? "halftime" : isFinal ? "final" : "clock"}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="mb-4"
        >
          {isHalftime ? (
            <div className="text-4xl font-bold text-amber-400">HALFTIME</div>
          ) : isFinal ? (
            <div className="text-4xl font-bold text-emerald-400">FINAL</div>
          ) : (
            <div
              className="text-6xl font-mono font-bold tracking-wider"
              style={{
                color: timeRemaining < 120 ? "#ef4444" : "white",
                textShadow: timeRemaining < 120 ? "0 0 20px #ef4444" : "none",
              }}
            >
              {formatTime(timeRemaining)}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Quarter name */}
      <div className="text-lg font-semibold text-white/60 mb-6">
        {QUARTER_NAMES[currentQuarter]}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setIsRunning(!isRunning)}
          disabled={isHalftime || isFinal}
          className={`p-4 rounded-full transition-all ${
            isRunning
              ? "bg-amber-500 hover:bg-amber-600"
              : "bg-[hsl(var(--scarlet))] hover:bg-[hsl(var(--scarlet-2))]"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRunning ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>
        <button
          onClick={handleReset}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Status indicator */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isRunning ? "bg-emerald-400 animate-pulse" : "bg-white/30"
          }`}
        />
        <span className="text-xs text-white/50">
          {isRunning ? "LIVE" : "PAUSED"}
        </span>
      </div>
    </div>
  );
}

