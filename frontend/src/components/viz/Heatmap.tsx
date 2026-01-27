"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

// Simple scarlet-on-dark ramp
function colorRamp(t: number) {
  const x = clamp(t, 0, 1);
  // background: near-black, high: scarlet + white highlight
  const r = lerp(10, 187, x);
  const g = lerp(10, 0, x);
  const b = lerp(14, 20, x);
  const a = 0.95;
  return `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, ${a})`;
}

export function Heatmap({
  xLabels,
  yLabels,
  values,
  formatValue,
  title,
}: {
  xLabels: number[];
  yLabels: number[];
  values: number[][];
  formatValue: (v: number) => string;
  title?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; v: number } | null>(null);

  const stats = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const row of values) {
      for (const v of row) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
    if (min === max) return { min: min - 1e-6, max: max + 1e-6 };
    return { min, max };
  }, [values]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = xLabels.length;
    const rows = yLabels.length;
    const pad = 14;
    const gridW = w - pad * 2;
    const gridH = h - pad * 2;
    const cellW = gridW / cols;
    const cellH = gridH / rows;

    ctx.clearRect(0, 0, w, h);

    // panel background
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = values[r]?.[c] ?? 0;
        const t = (v - stats.min) / (stats.max - stats.min);
        ctx.fillStyle = colorRamp(t);
        ctx.fillRect(pad + c * cellW, pad + r * cellH, cellW - 1, cellH - 1);
      }
    }

    // grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, gridW, gridH);

    if (title) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "600 12px system-ui";
      ctx.fillText(title, pad, 12);
    }
  }, [xLabels, yLabels, values, stats, title]);

  return (
    <div className="relative">
      <canvas
        ref={ref}
        className="h-[360px] w-full rounded-2xl border border-white/10"
        onMouseMove={(e) => {
          const canvas = ref.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const pad = 14;
          const cols = xLabels.length;
          const rows = yLabels.length;
          const gridW = rect.width - pad * 2;
          const gridH = rect.height - pad * 2;
          const cellW = gridW / cols;
          const cellH = gridH / rows;
          const cx = Math.floor((x - pad) / cellW);
          const cy = Math.floor((y - pad) / cellH);
          if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) {
            setHover(null);
            return;
          }
          const v = values[cy]?.[cx] ?? 0;
          setHover({ x: cx, y: cy, v });
        }}
        onMouseLeave={() => setHover(null)}
      />

      {hover ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-black/70 px-3 py-2 text-xs text-white backdrop-blur">
          <div className="font-semibold">{formatValue(hover.v)}</div>
          <div className="opacity-80">
            Attendance: {xLabels[hover.x].toLocaleString()} • Student ratio:{" "}
            {(yLabels[hover.y] * 100).toFixed(1)}%
          </div>
        </div>
      ) : null}
    </div>
  );
}


