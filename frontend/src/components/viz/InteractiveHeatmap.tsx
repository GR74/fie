"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  xLabel: string;
  yLabel: string;
}

interface InteractiveHeatmapProps {
  data: HeatmapCell[];
  xAxis: { label: string; values: number[]; format?: (v: number) => string };
  yAxis: { label: string; values: number[]; format?: (v: number) => string };
  valueLabel: string;
  valueFormat?: (v: number) => string;
  onCellClick?: (x: number, y: number) => void;
  colorScale?: "diverging" | "sequential";
  className?: string;
}

function getColor(value: number, min: number, max: number, colorScale: "diverging" | "sequential"): string {
  if (colorScale === "diverging") {
    // Red-white-green for diverging data (centered at 0)
    const mid = 0;
    if (value < mid) {
      const t = (value - min) / (mid - min);
      const r = Math.round(239 + (255 - 239) * t);
      const g = Math.round(68 + (255 - 68) * t);
      const b = Math.round(68 + (255 - 68) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = (value - mid) / (max - mid);
      const r = Math.round(255 - (255 - 34) * t);
      const g = Math.round(255 - (255 - 197) * t);
      const b = Math.round(255 - (255 - 94) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  } else {
    // Sequential: dark to scarlet
    const t = (value - min) / (max - min || 1);
    const r = Math.round(30 + (187 - 30) * t);
    const g = Math.round(30 + (0 - 30) * t);
    const b = Math.round(40 + (0 - 40) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function InteractiveHeatmap({
  data,
  xAxis,
  yAxis,
  valueLabel,
  valueFormat = (v) => v.toFixed(2),
  onCellClick,
  colorScale = "sequential",
  className = "",
}: InteractiveHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);

  const { min, max, grid } = useMemo(() => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Create grid lookup
    const grid = new Map<string, HeatmapCell>();
    data.forEach((d) => {
      grid.set(`${d.x}-${d.y}`, d);
    });
    
    return { min, max, grid };
  }, [data]);

  const xFormat = xAxis.format || ((v) => String(v));
  const yFormat = yAxis.format || ((v) => String(v));

  const handleClick = (x: number, y: number) => {
    setSelectedCell({ x, y });
    onCellClick?.(x, y);
  };

  const cellSize = Math.min(40, 320 / Math.max(xAxis.values.length, yAxis.values.length));

  return (
    <div className={className}>
      {/* Tooltip */}
      {hoveredCell && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-20 -mt-20 px-3 py-2 rounded-lg text-xs pointer-events-none"
          style={{
            background: "rgba(0,0,0,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold text-white">{valueLabel}: {valueFormat(hoveredCell.value)}</div>
          <div className="text-white/60 mt-1">
            {xAxis.label}: {hoveredCell.xLabel}
          </div>
          <div className="text-white/60">
            {yAxis.label}: {hoveredCell.yLabel}
          </div>
          {onCellClick && (
            <div className="text-[hsl(var(--scarlet))] mt-1 font-semibold">
              Click to apply
            </div>
          )}
        </motion.div>
      )}

      <div className="flex">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-center pr-2">
          <div 
            className="text-[10px] font-semibold text-white/50 -rotate-90 whitespace-nowrap origin-center"
            style={{ width: cellSize, height: 60 }}
          >
            {yAxis.label}
          </div>
        </div>
        <div className="flex flex-col items-end pr-2 justify-center" style={{ gap: 2 }}>
          {yAxis.values.map((y) => (
            <div
              key={y}
              className="text-[9px] text-white/50 text-right"
              style={{ height: cellSize, lineHeight: `${cellSize}px` }}
            >
              {yFormat(y)}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div>
          <div className="grid" style={{ gap: 2, gridTemplateColumns: `repeat(${xAxis.values.length}, ${cellSize}px)` }}>
            {yAxis.values.map((y) =>
              xAxis.values.map((x) => {
                const cell = grid.get(`${x}-${y}`);
                const value = cell?.value ?? 0;
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                
                return (
                  <motion.button
                    key={`${x}-${y}`}
                    className="rounded-sm transition-all"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: getColor(value, min, max, colorScale),
                      boxShadow: isSelected ? "0 0 0 2px white" : "none",
                    }}
                    whileHover={{ scale: 1.1, zIndex: 10 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={() => cell && setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => handleClick(x, y)}
                    title={cell ? `${valueLabel}: ${valueFormat(value)}` : "No data"}
                  />
                );
              })
            )}
          </div>

          {/* X-axis labels */}
          <div className="flex mt-2" style={{ gap: 2 }}>
            {xAxis.values.map((x) => (
              <div
                key={x}
                className="text-[9px] text-white/50 text-center"
                style={{ width: cellSize }}
              >
                {xFormat(x)}
              </div>
            ))}
          </div>
          <div className="text-[10px] font-semibold text-white/50 text-center mt-1">
            {xAxis.label}
          </div>
        </div>

        {/* Color scale legend */}
        <div className="ml-4 flex flex-col items-center">
          <div className="text-[9px] text-white/50 mb-1">{valueFormat(max)}</div>
          <div 
            className="w-3 rounded-sm"
            style={{
              height: cellSize * yAxis.values.length + (yAxis.values.length - 1) * 2,
              background: colorScale === "diverging"
                ? "linear-gradient(to bottom, rgb(34, 197, 94), rgb(255, 255, 255), rgb(239, 68, 68))"
                : "linear-gradient(to bottom, rgb(187, 0, 0), rgb(30, 30, 40))",
            }}
          />
          <div className="text-[9px] text-white/50 mt-1">{valueFormat(min)}</div>
        </div>
      </div>

      {/* Selection indicator */}
      {selectedCell && (
        <div className="mt-3 p-2 rounded-lg bg-white/5 border border-white/10 text-xs">
          <span className="text-white/50">Selected:</span>{" "}
          <span className="font-semibold">{xAxis.label} = {xFormat(selectedCell.x)}</span>,{" "}
          <span className="font-semibold">{yAxis.label} = {yFormat(selectedCell.y)}</span>
        </div>
      )}
    </div>
  );
}

