"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Types & Props                                                      */
/* ------------------------------------------------------------------ */
interface StadiumFillVizProps {
  attendance: number;
  capacity: number;
  studentRatio?: number;
  showStudentSplit?: boolean;
  venueName?: string;
  sport?: string;
  className?: string;
}

interface Section {
  id: string;
  path: string;
  fill: number;
  isStudent: boolean;
  tier: string;
}

type SportKey = "football" | "basketball" | "volleyball" | "baseball" | "soccer";

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                    */
/* ------------------------------------------------------------------ */
function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Convert polar angle (0° = top/north, clockwise) to cartesian. */
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG arc-sector path between two radii and two angles. */
function sectorPath(
  cx: number,
  cy: number,
  ri: number,
  ro: number,
  startDeg: number,
  endDeg: number,
) {
  const oS = polar(cx, cy, ro, startDeg);
  const oE = polar(cx, cy, ro, endDeg);
  const iE = polar(cx, cy, ri, endDeg);
  const iS = polar(cx, cy, ri, startDeg);
  const la = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${oS.x.toFixed(2)} ${oS.y.toFixed(2)}`,
    `A ${ro} ${ro} 0 ${la} 1 ${oE.x.toFixed(2)} ${oE.y.toFixed(2)}`,
    `L ${iE.x.toFixed(2)} ${iE.y.toFixed(2)}`,
    `A ${ri} ${ri} 0 ${la} 0 ${iS.x.toFixed(2)} ${iS.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** Deterministic noise for per-section fill variation. */
function sRand(seed: number) {
  const x = Math.sin(seed * 12345.6789) * 43758.5453;
  return x - Math.floor(x);
}

function resolveSport(s?: string): SportKey {
  if (s === "basketball") return "basketball";
  if (s === "volleyball") return "volleyball";
  if (s === "baseball") return "baseball";
  if (s === "soccer") return "soccer";
  return "football";
}

/* ------------------------------------------------------------------ */
/*  Section color system                                               */
/* ------------------------------------------------------------------ */
function sectionColor(fill: number, isStudent: boolean, tier: string): string {
  if (fill < 0.05) return "hsl(220 15% 7%)";
  if (isStudent) {
    return `hsl(354 ${lerp(45, 78, fill)}% ${lerp(12, 46, fill)}%)`;
  }
  if (tier === "club" || tier === "premium") {
    return `hsl(42 ${lerp(18, 55, fill)}% ${lerp(11, 38, fill)}%)`;
  }
  return `hsl(215 ${lerp(12, 32, fill)}% ${lerp(9, 38, fill)}%)`;
}

function sectionStroke(fill: number, isStudent: boolean): string {
  if (isStudent && fill > 0.5) return "hsl(354 78% 55% / 0.4)";
  return "rgba(255,255,255,0.05)";
}

function sectionFilter(fill: number, isStudent: boolean): string {
  if (fill < 0.65) return "none";
  if (isStudent)
    return `drop-shadow(0 0 ${3 + fill * 5}px hsl(354 78% 50% / ${fill * 0.45}))`;
  return "none";
}

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */
function AnimNum({
  value,
  fmt,
}: {
  value: number;
  fmt: (v: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    const dur = 500;
    const t0 = performance.now();
    let raf: number;
    function tick(now: number) {
      const p = clamp((now - t0) / dur, 0, 1);
      const e = 1 - (1 - p) ** 3;
      setDisplay(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{fmt(display)}</>;
}

/* ------------------------------------------------------------------ */
/*  Pulse rings (crowd energy emanation)                               */
/* ------------------------------------------------------------------ */
function PulseRings({ cx, cy, intensity }: { cx: number; cy: number; intensity: number }) {
  if (intensity < 0.45) return null;
  const a = clamp((intensity - 0.45) / 0.55, 0, 1);
  return (
    <g opacity={a * 0.55}>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={cx} cy={cy} r={180 + i * 15} fill="none"
          stroke={`hsl(354 78% 50% / ${0.14 - i * 0.04})`} strokeWidth="1">
          <animate attributeName="r"
            values={`${180 + i * 15};${190 + i * 15};${180 + i * 15}`}
            dur={`${2.4 + i * 0.4}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.15;0.6"
            dur={`${2.4 + i * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

/* ================================================================== */
/*  FOOTBALL HORSESHOE                                                 */
/* ================================================================== */
function useFootballSections(fillRatio: number, showStudent: boolean): Section[] {
  return useMemo(() => {
    const cx = 200, cy = 200;
    const out: Section[] = [];
    const tiers = [
      { name: "lower", ri: 88, ro: 118, mod: 1.0, n: 22, s: 32, e: 328 },
      { name: "club", ri: 121, ro: 136, mod: 0.96, n: 18, s: 40, e: 320 },
      { name: "upper", ri: 139, ro: 168, mod: 0.88, n: 20, s: 46, e: 314 },
    ];
    tiers.forEach((t) => {
      const span = (t.e - t.s) / t.n;
      const gap = span * 0.055;
      for (let i = 0; i < t.n; i++) {
        const a0 = t.s + i * span + gap;
        const a1 = t.s + (i + 1) * span - gap;
        const mid = (a0 + a1) / 2;
        const isStudent = showStudent && t.name === "lower" && (mid < 68 || mid > 292);
        const f = clamp(fillRatio * t.mod + sRand(i * 7 + t.name.charCodeAt(0)) * 0.08 - 0.04, 0, 1);
        out.push({
          id: `${t.name}-${i}`,
          path: sectorPath(cx, cy, t.ri, t.ro, a0, a1),
          fill: f,
          isStudent,
          tier: t.name,
        });
      }
    });
    return out;
  }, [fillRatio, showStudent]);
}

function FootballField() {
  const cx = 200, cy = 200, fw = 56, fh = 96;
  return (
    <g>
      <rect x={cx - fw / 2} y={cy - fh / 2} width={fw} height={fh} rx="3" fill="#17522a" />
      <rect x={cx - fw / 2 + 2} y={cy - fh / 2 + 2} width={fw - 4} height={fh - 4} rx="2" fill="#1d6430" />
      {/* Yard lines */}
      {Array.from({ length: 11 }, (_, i) => {
        const y = cy - fh / 2 + 5 + (i * (fh - 10)) / 10;
        return (
          <line key={i} x1={cx - fw / 2 + 5} y1={y} x2={cx + fw / 2 - 5} y2={y}
            stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        );
      })}
      {/* 50 */}
      <line x1={cx - fw / 2 + 5} y1={cy} x2={cx + fw / 2 - 5} y2={cy}
        stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
      {/* End zones */}
      <rect x={cx - fw / 2 + 2} y={cy - fh / 2 + 2} width={fw - 4} height={9} rx="1"
        fill="hsl(354 65% 25%)" opacity="0.7" />
      <rect x={cx - fw / 2 + 2} y={cy + fh / 2 - 11} width={fw - 4} height={9} rx="1"
        fill="hsl(0 0% 28%)" opacity="0.3" />
      {/* Center logo */}
      <circle cx={cx} cy={cy} r="5.5" fill="hsl(354 70% 30%)" opacity="0.35" />
      <circle cx={cx} cy={cy} r="3" fill="hsl(354 70% 42%)" opacity="0.25" />
    </g>
  );
}

/* ================================================================== */
/*  BASKETBALL / VOLLEYBALL ARENA (full 360° enclosed)                 */
/* ================================================================== */
function useArenaSections(fillRatio: number, showStudent: boolean): Section[] {
  return useMemo(() => {
    const cx = 200, cy = 200;
    const out: Section[] = [];
    const tiers = [
      { name: "lower", ri: 78, ro: 114, mod: 1.0, n: 24 },
      { name: "upper", ri: 117, ro: 158, mod: 0.9, n: 28 },
    ];
    tiers.forEach((t) => {
      const span = 360 / t.n;
      const gap = span * 0.05;
      for (let i = 0; i < t.n; i++) {
        const a0 = i * span + gap;
        const a1 = (i + 1) * span - gap;
        const isStudent = showStudent && t.name === "lower" && i >= 10 && i <= 16;
        const f = clamp(fillRatio * t.mod + sRand(i * 11 + 50) * 0.06 - 0.03, 0, 1);
        out.push({
          id: `${t.name}-${i}`,
          path: sectorPath(cx, cy, t.ri, t.ro, a0, a1),
          fill: f,
          isStudent,
          tier: t.name,
        });
      }
    });
    return out;
  }, [fillRatio, showStudent]);
}

function BasketballCourt() {
  const cx = 200, cy = 200, cw = 62, ch = 34;
  return (
    <g>
      <rect x={cx - cw / 2} y={cy - ch / 2} width={cw} height={ch} rx="2" fill="#b07040" />
      <rect x={cx - cw / 2 + 1.5} y={cy - ch / 2 + 1.5} width={cw - 3} height={ch - 3} rx="1" fill="#c48858" />
      <line x1={cx} y1={cy - ch / 2 + 2} x2={cx} y2={cy + ch / 2 - 2}
        stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />
      <circle cx={cx} cy={cy} r="7" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
      <circle cx={cx} cy={cy} r="1.3" fill="hsl(354 70% 40%)" opacity="0.5" />
      <rect x={cx - cw / 2 + 2} y={cy - 8} width="11" height="16" fill="none"
        stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      <rect x={cx + cw / 2 - 13} y={cy - 8} width="11" height="16" fill="none"
        stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
    </g>
  );
}

function VolleyballCourt() {
  const cx = 200, cy = 200, cw = 52, ch = 28;
  return (
    <g>
      <rect x={cx - cw / 2} y={cy - ch / 2} width={cw} height={ch} rx="2" fill="#9a6035" />
      <rect x={cx - cw / 2 + 1.5} y={cy - ch / 2 + 1.5} width={cw - 3} height={ch - 3} rx="1" fill="#b57848" />
      <line x1={cx - cw / 2 + 2} y1={cy} x2={cx + cw / 2 - 2} y2={cy}
        stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
      <rect x={cx - cw / 2 + 4} y={cy - ch / 2 + 3} width={cw - 8} height={ch - 6}
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      <line x1={cx - cw / 2 + 4} y1={cy - 7} x2={cx + cw / 2 - 4} y2={cy - 7}
        stroke="rgba(255,255,255,0.22)" strokeWidth="0.5" />
      <line x1={cx - cw / 2 + 4} y1={cy + 7} x2={cx + cw / 2 - 4} y2={cy + 7}
        stroke="rgba(255,255,255,0.22)" strokeWidth="0.5" />
    </g>
  );
}

/* ================================================================== */
/*  BASEBALL STADIUM (fan-shaped)                                      */
/* ================================================================== */
function useBaseballSections(fillRatio: number, showStudent: boolean): Section[] {
  return useMemo(() => {
    const cx = 200, cy = 240;
    const out: Section[] = [];
    const tiers: Array<{
      name: string; ri: number; ro: number; mod: number; n: number; s: number; e: number;
    }> = [
      { name: "lower", ri: 72, ro: 108, mod: 1.0, n: 16, s: 110, e: 250 },
      { name: "upper", ri: 111, ro: 148, mod: 0.86, n: 14, s: 118, e: 242 },
      { name: "bleachers-r", ri: 111, ro: 140, mod: 0.75, n: 4, s: 250, e: 290 },
      { name: "bleachers-l", ri: 111, ro: 140, mod: 0.75, n: 4, s: 70, e: 110 },
    ];
    tiers.forEach((t) => {
      const arcSpan = t.e - t.s;
      const span = arcSpan / t.n;
      const gap = span * 0.06;
      for (let i = 0; i < t.n; i++) {
        const a0 = t.s + i * span + gap;
        const a1 = t.s + (i + 1) * span - gap;
        const isStudent = showStudent && t.name === "lower" && i >= 5 && i <= 10;
        const f = clamp(fillRatio * t.mod + sRand(i * 13 + t.s) * 0.08 - 0.04, 0, 1);
        out.push({
          id: `${t.name}-${i}`,
          path: sectorPath(cx, cy, t.ri, t.ro, a0, a1),
          fill: f,
          isStudent,
          tier: t.name,
        });
      }
    });
    return out;
  }, [fillRatio, showStudent]);
}

function BaseballDiamond() {
  const cx = 200, cy = 240;
  return (
    <g>
      {/* Outfield grass */}
      <path
        d={`M ${cx} ${cy} L ${cx - 56} ${cy - 56} A 80 80 0 0 1 ${cx + 56} ${cy - 56} Z`}
        fill="#1b5e28"
      />
      <path
        d={`M ${cx} ${cy} L ${cx - 50} ${cy - 50} A 72 72 0 0 1 ${cx + 50} ${cy - 50} Z`}
        fill="#228833"
      />
      {/* Infield */}
      <polygon
        points={`${cx},${cy} ${cx - 22},${cy - 22} ${cx},${cy - 44} ${cx + 22},${cy - 22}`}
        fill="#c09a60"
      />
      <polygon
        points={`${cx},${cy - 1} ${cx - 20},${cy - 21} ${cx},${cy - 42} ${cx + 20},${cy - 21}`}
        fill="#cca870"
      />
      {/* Bases */}
      {[
        [cx, cy - 1],
        [cx - 22, cy - 22],
        [cx, cy - 44],
        [cx + 22, cy - 22],
      ].map(([bx, by], i) => (
        <rect key={i} x={bx - 1.3} y={by - 1.3} width="2.6" height="2.6" fill="white"
          transform={`rotate(45 ${bx} ${by})`} />
      ))}
      {/* Foul lines */}
      <line x1={cx} y1={cy} x2={cx - 56} y2={cy - 56}
        stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
      <line x1={cx} y1={cy} x2={cx + 56} y2={cy - 56}
        stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
    </g>
  );
}

/* ================================================================== */
/*  SOCCER STADIUM (rectangular four-sided)                            */
/* ================================================================== */
function useSoccerSections(fillRatio: number, showStudent: boolean): Section[] {
  return useMemo(() => {
    const cx = 200, cy = 200;
    const out: Section[] = [];
    const hw = 90, hh = 64; // half-width / half-height of pitch area
    const d = 22; // stand depth

    // North stand (top)
    const ns = 10;
    const segW = (hw * 2) / ns;
    for (let i = 0; i < ns; i++) {
      const x1 = cx - hw + i * segW + 1;
      const x2 = cx - hw + (i + 1) * segW - 1;
      const y1 = cy - hh - d;
      const y2 = cy - hh;
      const isStudent = showStudent && i >= 3 && i <= 6;
      const f = clamp(fillRatio + sRand(i * 7) * 0.06 - 0.03, 0, 1);
      out.push({ id: `n-${i}`, path: `M${x1} ${y1}L${x2} ${y1}L${x2} ${y2}L${x1} ${y2}Z`, fill: f, isStudent, tier: "lower" });
    }
    // South stand (bottom)
    for (let i = 0; i < ns; i++) {
      const x1 = cx - hw + i * segW + 1;
      const x2 = cx - hw + (i + 1) * segW - 1;
      const y1 = cy + hh;
      const y2 = cy + hh + d;
      const isS = showStudent && i >= 3 && i <= 6;
      const f = clamp(fillRatio + sRand(i * 11 + 30) * 0.06 - 0.03, 0, 1);
      out.push({ id: `s-${i}`, path: `M${x1} ${y1}L${x2} ${y1}L${x2} ${y2}L${x1} ${y2}Z`, fill: f, isStudent: isS, tier: "lower" });
    }
    // West (left)
    const ss = 10;
    const innerH = hh * 2;
    const segH = innerH / ss;
    for (let i = 0; i < ss; i++) {
      const y1 = cy - hh + i * segH + 1;
      const y2 = cy - hh + (i + 1) * segH - 1;
      const x1 = cx - hw - d;
      const x2 = cx - hw;
      const f = clamp(fillRatio * 0.95 + sRand(i * 13 + 50) * 0.06 - 0.03, 0, 1);
      out.push({ id: `w-${i}`, path: `M${x1} ${y1}L${x2} ${y1}L${x2} ${y2}L${x1} ${y2}Z`, fill: f, isStudent: false, tier: "lower" });
    }
    // East (right)
    for (let i = 0; i < ss; i++) {
      const y1 = cy - hh + i * segH + 1;
      const y2 = cy - hh + (i + 1) * segH - 1;
      const x1 = cx + hw;
      const x2 = cx + hw + d;
      const f = clamp(fillRatio * 0.95 + sRand(i * 17 + 70) * 0.06 - 0.03, 0, 1);
      out.push({ id: `e-${i}`, path: `M${x1} ${y1}L${x2} ${y1}L${x2} ${y2}L${x1} ${y2}Z`, fill: f, isStudent: false, tier: "lower" });
    }
    // Corner fills
    const corners = [
      { id: "cnw", x: cx - hw - d, y: cy - hh - d, w: d, h: d },
      { id: "cne", x: cx + hw, y: cy - hh - d, w: d, h: d },
      { id: "csw", x: cx - hw - d, y: cy + hh, w: d, h: d },
      { id: "cse", x: cx + hw, y: cy + hh, w: d, h: d },
    ];
    corners.forEach((c, ci) => {
      const f = clamp(fillRatio * 0.8 + sRand(ci * 19 + 90) * 0.06 - 0.03, 0, 1);
      out.push({ id: c.id, path: `M${c.x} ${c.y}L${c.x + c.w} ${c.y}L${c.x + c.w} ${c.y + c.h}L${c.x} ${c.y + c.h}Z`, fill: f, isStudent: false, tier: "lower" });
    });
    return out;
  }, [fillRatio, showStudent]);
}

function SoccerPitch() {
  const cx = 200, cy = 200, pw = 160, ph = 112;
  return (
    <g>
      <rect x={cx - pw / 2} y={cy - ph / 2} width={pw} height={ph} rx="2" fill="#1b5e28" />
      <rect x={cx - pw / 2 + 2} y={cy - ph / 2 + 2} width={pw - 4} height={ph - 4} rx="1" fill="#228833" />
      <g stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" fill="none">
        <rect x={cx - pw / 2 + 5} y={cy - ph / 2 + 5} width={pw - 10} height={ph - 10} />
        <line x1={cx} y1={cy - ph / 2 + 5} x2={cx} y2={cy + ph / 2 - 5} />
        <circle cx={cx} cy={cy} r="12" />
        <circle cx={cx} cy={cy} r="1.3" fill="rgba(255,255,255,0.4)" />
        <rect x={cx - 22} y={cy - ph / 2 + 5} width="44" height="16" />
        <rect x={cx - 22} y={cy + ph / 2 - 21} width="44" height="16" />
        <rect x={cx - 10} y={cy - ph / 2 + 5} width="20" height="7" />
        <rect x={cx - 10} y={cy + ph / 2 - 12} width="20" height="7" />
      </g>
    </g>
  );
}

/* ================================================================== */
/*  MAIN EXPORTED COMPONENT                                            */
/* ================================================================== */
export function StadiumFillViz({
  attendance,
  capacity,
  studentRatio,
  showStudentSplit = true,
  venueName = "Stadium",
  sport = "football",
  className = "",
}: StadiumFillVizProps) {
  const safeCapacity = Math.max(1, capacity);
  const fillRatio = clamp(attendance / safeCapacity, 0, 1.15);
  const fillPct = Math.min(100, fillRatio * 100);
  const ratio = showStudentSplit ? clamp(studentRatio ?? 0, 0, 1) : 0;
  const studentCount = Math.round(attendance * ratio);
  const generalCount = Math.max(0, attendance - studentCount);
  const availableCount = Math.max(0, capacity - attendance);
  const isSellout = fillPct >= 98;
  const sportKey = resolveSport(sport);
  const fr = clamp(fillRatio, 0, 1);

  /* Compute sections for every sport — hooks must be unconditional */
  const fb = useFootballSections(fr, showStudentSplit && sportKey === "football");
  const bk = useArenaSections(fr, showStudentSplit && (sportKey === "basketball" || sportKey === "volleyball"));
  const bb = useBaseballSections(fr, showStudentSplit && sportKey === "baseball");
  const sc = useSoccerSections(fr, showStudentSplit && sportKey === "soccer");

  const sections =
    sportKey === "football" ? fb
    : sportKey === "basketball" || sportKey === "volleyball" ? bk
    : sportKey === "baseball" ? bb
    : sc;

  const vb = sportKey === "baseball" ? "0 0 400 340" : "0 0 400 400";
  const svgCx = 200;
  const svgCy = sportKey === "baseball" ? 240 : 200;

  const archLabel =
    sportKey === "football" ? "Horseshoe Bowl"
    : sportKey === "basketball" ? "Enclosed Arena"
    : sportKey === "volleyball" ? "Compact Arena"
    : sportKey === "baseball" ? "Diamond Park"
    : "Rectangular Pitch";

  const [hovered, setHovered] = useState<Section | null>(null);

  return (
    <motion.div
      className={`rounded-2xl border border-white/[0.08] overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background:
          "linear-gradient(160deg, hsl(220 22% 6%) 0%, hsl(224 20% 10%) 50%, hsl(220 18% 8%) 100%)",
      }}
    >
      {/* ---- Header ---- */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <span className="text-white/90">{venueName}</span>
            {isSellout && (
              <motion.span
                className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
                style={{
                  background: "linear-gradient(135deg, hsl(354 78% 50%), hsl(354 78% 38%))",
                  boxShadow: "0 2px 12px hsl(354 78% 50% / 0.5)",
                  color: "white",
                }}
                animate={{
                  boxShadow: [
                    "0 2px 12px hsl(354 78% 50% / 0.3)",
                    "0 2px 20px hsl(354 78% 50% / 0.6)",
                    "0 2px 12px hsl(354 78% 50% / 0.3)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                SELLOUT
              </motion.span>
            )}
          </div>
          <div className="text-[11px] text-white/35 mt-0.5 uppercase tracking-wider font-medium">
            {archLabel}
          </div>
        </div>
        <div className="text-right">
          <motion.div
            className="text-2xl font-bold tabular-nums tracking-tight"
            style={{
              color: isSellout
                ? "hsl(354 78% 55%)"
                : fillPct >= 90
                  ? "hsl(45 90% 55%)"
                  : fillPct >= 70
                    ? "hsl(180 60% 50%)"
                    : "hsl(220 15% 60%)",
              textShadow: isSellout ? "0 0 16px hsl(354 78% 55% / 0.5)" : "none",
            }}
            key={Math.round(fillPct)}
            initial={{ scale: 1.05, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimNum value={fillPct} fmt={(v) => `${v.toFixed(1)}%`} />
          </motion.div>
          <div className="text-[10px] text-white/30 tabular-nums">
            <AnimNum value={attendance} fmt={(v) => Math.round(v).toLocaleString()} />{" "}
            / {capacity.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ---- SVG Visualization ---- */}
      <div className="relative px-3 py-4">
        <div
          className="relative w-full max-w-[420px] mx-auto"
          style={{ aspectRatio: sportKey === "baseball" ? "400/340" : "1" }}
        >
          <svg viewBox={vb} className="w-full h-full" style={{ overflow: "visible" }}>
            <defs>
              <filter id="sfv-blur">
                <feGaussianBlur stdDeviation="6" />
              </filter>
              <radialGradient id="sfv-heat" cx="50%" cy={sportKey === "baseball" ? "70%" : "50%"} r="50%">
                <stop offset="0%" stopColor="hsl(354 78% 50%)" stopOpacity={clamp((fr - 0.75) * 2.5, 0, 0.18)} />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background ambient glow */}
            <ellipse cx={svgCx} cy={svgCy} rx="190" ry="190" fill="url(#sfv-heat)" />

            {/* Sport-specific playing surface */}
            {sportKey === "football" && <FootballField />}
            {sportKey === "basketball" && <BasketballCourt />}
            {sportKey === "volleyball" && <VolleyballCourt />}
            {sportKey === "baseball" && <BaseballDiamond />}
            {sportKey === "soccer" && <SoccerPitch />}

            {/* Seating sections */}
            {sections.map((s) => (
              <path
                key={s.id}
                d={s.path}
                fill={sectionColor(s.fill, s.isStudent, s.tier)}
                stroke={sectionStroke(s.fill, s.isStudent)}
                strokeWidth={s.isStudent && s.fill > 0.5 ? "1" : "0.5"}
                opacity={0.55 + s.fill * 0.45}
                style={{
                  filter: sectionFilter(s.fill, s.isStudent),
                  cursor: "pointer",
                  transition: "fill 0.35s ease, opacity 0.35s ease, filter 0.35s ease",
                }}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}

            {/* Pulse rings at high fill */}
            <PulseRings cx={svgCx} cy={svgCy} intensity={fr} />

            {/* Labels */}
            {sportKey === "football" && (
              <text x={svgCx} y={svgCy + 100} textAnchor="middle" fontSize="8"
                fill="rgba(255,255,255,0.18)"
                style={{ letterSpacing: "0.18em", fontWeight: 600 }}>
                OPEN SOUTH END
              </text>
            )}
            {(sportKey === "basketball" || sportKey === "volleyball") && (
              <text x={svgCx} y={38} textAnchor="middle" fontSize="8"
                fill="rgba(255,255,255,0.18)"
                style={{ letterSpacing: "0.15em", fontWeight: 600 }}>
                ENCLOSED ARENA
              </text>
            )}
          </svg>

          {/* Hover tooltip */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                className="absolute top-3 left-3 px-3 py-2 rounded-lg text-xs pointer-events-none z-10"
                style={{
                  background: "rgba(0,0,0,0.88)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)",
                }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                <div className="font-semibold text-white/80 capitalize">
                  {hovered.id.replace(/-/g, " ")}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-white/50">
                  <span>{(hovered.fill * 100).toFixed(0)}% filled</span>
                  {hovered.isStudent && (
                    <span className="text-[hsl(354,78%,55%)]">Student section</span>
                  )}
                  <span className="capitalize">{hovered.tier}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ---- Stats footer ---- */}
      {showStudentSplit ? (
        <div className="px-4 py-3 border-t border-white/[0.06]" style={{ background: "rgba(0,0,0,0.15)" }}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: studentCount, label: "Students", c: "hsl(354 78% 55%)", bar: "hsl(354 78% 55% / 0.4)" },
              { v: generalCount, label: "General", c: "hsl(215 30% 65%)", bar: "hsl(215 30% 50% / 0.3)" },
              { v: availableCount, label: "Available", c: "hsl(220 10% 45%)", bar: "hsl(220 10% 30% / 0.3)" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <motion.div
                  className="text-lg font-bold tabular-nums"
                  style={{ color: s.c }}
                  key={s.v}
                  initial={{ y: 3, opacity: 0.5 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  <AnimNum value={s.v} fmt={(v) => Math.round(v).toLocaleString()} />
                </motion.div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mt-0.5">
                  {s.label}
                </div>
                <div className="mt-1.5 h-[2px] rounded-full mx-auto w-10" style={{ background: s.bar }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-white/[0.06]" style={{ background: "rgba(0,0,0,0.15)" }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <motion.div className="text-lg font-bold tabular-nums" style={{ color: "hsl(354 78% 55%)" }}>
                <AnimNum value={attendance} fmt={(v) => Math.round(v).toLocaleString()} />
              </motion.div>
              <div className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mt-0.5">
                Attendance
              </div>
            </div>
            <div className="text-center">
              <motion.div className="text-lg font-bold tabular-nums text-white/70">
                <AnimNum value={fillPct} fmt={(v) => `${v.toFixed(1)}%`} />
              </motion.div>
              <div className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mt-0.5">
                Fill Rate
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Legend ---- */}
      <div className="px-4 py-2 border-t border-white/[0.04] flex items-center justify-center gap-5 text-[8px] text-white/25 uppercase tracking-widest font-medium">
        {showStudentSplit && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm"
              style={{ background: "hsl(354 70% 40%)", boxShadow: "0 0 4px hsl(354 70% 40% / 0.5)" }} />
            <span>Block O</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm" style={{ background: "hsl(215 28% 32%)" }} />
          <span>General</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm" style={{ background: "hsl(220 15% 9%)" }} />
          <span>Empty</span>
        </div>
      </div>
    </motion.div>
  );
}
