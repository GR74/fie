"use client";

import { useMemo } from "react";

interface StadiumFillVizProps {
  attendance: number;
  capacity: number;
  studentRatio?: number;
  showStudentSplit?: boolean;
  venueName?: string;
  sport?: string;
  className?: string;
}

type SportKey = "football" | "basketball" | "volleyball" | "baseball" | "soccer";

type SportLayout = {
  icon: string;
  label: string;
  hue: number;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
  yScale: number;
  startDeg: number;
  endDeg: number;
  sections: number;
  phase: number;
  studentRanges: Array<[number, number]>;
};

type FootballSection = {
  index: number;
  fill: number;
  d: string;
  color: string;
  markerX: number;
  markerY: number;
};

const SPORT_LAYOUTS: Record<SportKey, SportLayout> = {
  football: {
    icon: "🏈",
    label: "Football Bowl",
    hue: 220,
    centerX: 130,
    centerY: 102,
    innerRadius: 68,
    outerRadius: 104,
    yScale: 0.7,
    startDeg: 202,
    endDeg: 338,
    sections: 18,
    phase: 0.15,
    studentRanges: [[7, 10]],
  },
  basketball: {
    icon: "🏀",
    label: "Arena Bowl",
    hue: 28,
    centerX: 130,
    centerY: 96,
    innerRadius: 56,
    outerRadius: 92,
    yScale: 0.75,
    startDeg: 0,
    endDeg: 360,
    sections: 16,
    phase: 0.8,
    studentRanges: [[3, 4], [11, 12]],
  },
  volleyball: {
    icon: "🏐",
    label: "Compact Arena",
    hue: 186,
    centerX: 130,
    centerY: 96,
    innerRadius: 52,
    outerRadius: 86,
    yScale: 0.74,
    startDeg: 0,
    endDeg: 360,
    sections: 14,
    phase: 1.2,
    studentRanges: [[3, 5]],
  },
  baseball: {
    icon: "⚾",
    label: "Outfield Bowl",
    hue: 122,
    centerX: 130,
    centerY: 118,
    innerRadius: 66,
    outerRadius: 104,
    yScale: 0.84,
    startDeg: 208,
    endDeg: 332,
    sections: 14,
    phase: 0.35,
    studentRanges: [[1, 3]],
  },
  soccer: {
    icon: "⚽",
    label: "Pitch Arena",
    hue: 206,
    centerX: 130,
    centerY: 96,
    innerRadius: 60,
    outerRadius: 96,
    yScale: 0.73,
    startDeg: 0,
    endDeg: 360,
    sections: 18,
    phase: 0.6,
    studentRanges: [[0, 2]],
  },
};

function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x));
}

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function resolveSport(sport?: string): SportKey {
  if (sport === "basketball") return "basketball";
  if (sport === "volleyball") return "volleyball";
  if (sport === "baseball") return "baseball";
  if (sport === "soccer") return "soccer";
  return "football";
}

function normalizeArc(startDeg: number, endDeg: number) {
  let end = endDeg;
  while (end <= startDeg) end += 360;
  return { startDeg, endDeg: end, span: end - startDeg };
}

function isIndexInRanges(index: number, ranges: Array<[number, number]>) {
  return ranges.some(([start, end]) => index >= start && index <= end);
}

function getSectionFill(index: number, sections: number, baseFill: number, phase: number) {
  const t = index / Math.max(sections - 1, 1);
  const wave = Math.sin(t * Math.PI * 2 + phase) * 0.08;
  const centerBoost = (1 - Math.abs(t - 0.5) * 2) * 0.04;
  return clamp(baseFill + wave + centerBoost - 0.03, 0, 1);
}

function getSeatColor({
  sport,
  fill,
  isStudent,
  showStudentSplit,
}: {
  sport: SportLayout;
  fill: number;
  isStudent: boolean;
  showStudentSplit: boolean;
}) {
  if (fill <= 0.04) return "hsl(228 18% 14%)";
  if (isStudent && showStudentSplit) {
    const light = 28 + fill * 24;
    return `hsl(354 82% ${light.toFixed(1)}%)`;
  }
  const sat = 22 + fill * 34;
  const light = 18 + fill * 38;
  return `hsl(${sport.hue} ${sat.toFixed(1)}% ${light.toFixed(1)}%)`;
}

function pointAt(layout: SportLayout, radius: number, angleDeg: number) {
  const r = toRadians(angleDeg);
  return {
    x: layout.centerX + Math.cos(r) * radius,
    y: layout.centerY + Math.sin(r) * radius * layout.yScale,
  };
}

function getSections(layout: SportLayout, fillRatio: number, showStudentSplit: boolean) {
  const arc = normalizeArc(layout.startDeg, layout.endDeg);
  const step = arc.span / layout.sections;

  return Array.from({ length: layout.sections }, (_, index) => {
    const a0 = arc.startDeg + index * step;
    const a1 = a0 + step * 0.94;

    const innerStart = pointAt(layout, layout.innerRadius, a0);
    const innerEnd = pointAt(layout, layout.innerRadius, a1);
    const outerEnd = pointAt(layout, layout.outerRadius, a1);
    const outerStart = pointAt(layout, layout.outerRadius, a0);

    const fill = getSectionFill(index, layout.sections, fillRatio, layout.phase);
    const isStudent = isIndexInRanges(index, layout.studentRanges);

    return {
      index,
      fill,
      isStudent,
      d: `M ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)} L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)} L ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)} L ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)} Z`,
      color: getSeatColor({ sport: layout, fill, isStudent, showStudentSplit }),
    };
  });
}

function getFootballSections(attendance: number, capacity: number, showStudentSplit: boolean): FootballSection[] {
  const numSections = 24;
  const safeCapacity = Math.max(1, capacity);
  const seatsPerSection = Math.ceil(safeCapacity / numSections);
  const centerX = 130;
  const centerY = 96;
  const innerRadius = 60;
  const outerRadius = 90;
  const yScale = 0.6;

  const sections: FootballSection[] = [];

  for (let index = 0; index < numSections; index += 1) {
    // Keep open horseshoe ends like the original football view.
    if (index <= 4 || index >= 20) continue;

    const angle = (index / numSections) * Math.PI + Math.PI / 2;
    const startAngle = angle - Math.PI / 26;
    const endAngle = angle + Math.PI / 26;

    const sectionStart = index * seatsPerSection;
    const sectionEnd = Math.min((index + 1) * seatsPerSection, safeCapacity);
    const sectionCapacity = Math.max(1, sectionEnd - sectionStart);
    const filledInSection = Math.min(sectionCapacity, Math.max(0, attendance - sectionStart));
    const fill = clamp(filledInSection / sectionCapacity, 0, 1);
    const isStudentSection = index >= 10 && index <= 14;

    const x1 = centerX + Math.cos(startAngle) * innerRadius;
    const y1 = centerY + Math.sin(startAngle) * innerRadius * yScale;
    const x2 = centerX + Math.cos(endAngle) * innerRadius;
    const y2 = centerY + Math.sin(endAngle) * innerRadius * yScale;
    const x3 = centerX + Math.cos(endAngle) * outerRadius;
    const y3 = centerY + Math.sin(endAngle) * outerRadius * yScale;
    const x4 = centerX + Math.cos(startAngle) * outerRadius;
    const y4 = centerY + Math.sin(startAngle) * outerRadius * yScale;

    const color = fill > 0
      ? (
          isStudentSection && showStudentSplit
            ? `hsl(354 78% ${(35 + fill * 25).toFixed(1)}%)`
            : `hsl(220 ${(10 + fill * 5).toFixed(1)}% ${(25 + fill * 45).toFixed(1)}%)`
        )
      : "hsl(228 18% 14%)";

    sections.push({
      index,
      fill,
      d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} L ${x4.toFixed(2)} ${y4.toFixed(2)} Z`,
      color,
      markerX: (x1 + x2 + x3 + x4) / 4,
      markerY: (y1 + y2 + y3 + y4) / 4,
    });
  }

  return sections;
}

function SportField({ sport }: { sport: SportKey }) {
  if (sport === "football") {
    return (
      <>
        <ellipse cx="130" cy="96" rx="55" ry="35" fill="#1a4d1a" stroke="#2d6b2d" strokeWidth="2" />
        {Array.from({ length: 5 }).map((_, index) => (
          <line
            key={index}
            x1={90 + index * 20}
            y1="71"
            x2={90 + index * 20}
            y2="121"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.8"
          />
        ))}
        <circle cx="130" cy="96" r="8" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
        <path d="M 75 76 Q 75 96 75 116 L 85 111 L 85 81 Z" fill="hsl(var(--scarlet))" opacity="0.72" />
        <path d="M 185 76 Q 185 96 185 116 L 175 111 L 175 81 Z" fill="rgba(255,255,255,0.4)" />
        <text x="130" y="100" textAnchor="middle" fontSize="12" fontWeight="700" fill="rgba(255,255,255,0.3)">OSU</text>
      </>
    );
  }

  if (sport === "basketball") {
    return (
      <>
        <rect x="76" y="55" width="108" height="82" rx="10" fill="#c6844c" stroke="#8f5d37" strokeWidth="2" />
        <line x1="130" y1="55" x2="130" y2="137" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" />
        <circle cx="130" cy="96" r="14" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" />
        <rect x="76" y="74" width="16" height="44" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
        <rect x="168" y="74" width="16" height="44" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
      </>
    );
  }

  if (sport === "volleyball") {
    return (
      <>
        <rect x="74" y="58" width="112" height="76" rx="6" fill="#b77747" stroke="#8f5d37" strokeWidth="2" />
        <rect x="74" y="58" width="112" height="76" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
        <line x1="130" y1="58" x2="130" y2="134" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" />
        <line x1="130" y1="58" x2="130" y2="134" stroke="rgba(255,255,255,0.35)" strokeWidth="4" strokeDasharray="2 3" />
      </>
    );
  }

  if (sport === "baseball") {
    return (
      <>
        <polygon points="130,70 154,94 130,118 106,94" fill="#cfa777" stroke="#b78b59" strokeWidth="1.8" />
        <line x1="130" y1="70" x2="130" y2="46" stroke="#f4e1be" strokeWidth="1.2" opacity="0.7" />
        <line x1="106" y1="94" x2="130" y2="70" stroke="#f4e1be" strokeWidth="1.1" opacity="0.6" />
        <line x1="154" y1="94" x2="130" y2="70" stroke="#f4e1be" strokeWidth="1.1" opacity="0.6" />
        <circle cx="130" cy="96" r="4" fill="#f4e1be" />
        <circle cx="130" cy="70" r="3" fill="#f4e1be" />
        <circle cx="154" cy="94" r="3" fill="#f4e1be" />
        <circle cx="106" cy="94" r="3" fill="#f4e1be" />
        <text x="130" y="134" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)" style={{ letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Infield Focus
        </text>
      </>
    );
  }

  if (sport === "soccer") {
    return (
      <>
        <rect x="66" y="56" width="128" height="80" rx="8" fill="#2d7f42" stroke="#3f9f57" strokeWidth="2" />
        <line x1="130" y1="56" x2="130" y2="136" stroke="rgba(255,255,255,0.68)" strokeWidth="1.2" />
        <circle cx="130" cy="96" r="15" fill="none" stroke="rgba(255,255,255,0.68)" strokeWidth="1.2" />
        <rect x="66" y="76" width="18" height="40" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <rect x="176" y="76" width="18" height="40" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      </>
    );
  }

  return null;
}

export function StadiumFillViz({
  attendance,
  capacity,
  studentRatio,
  showStudentSplit = true,
  venueName = "Ohio Stadium",
  sport = "football",
  className = "",
}: StadiumFillVizProps) {
  const safeCapacity = Math.max(1, capacity);
  const fillRatio = clamp(attendance / safeCapacity, 0, 1.2);
  const fillPct = Math.min(100, fillRatio * 100);
  const ratio = showStudentSplit ? clamp(studentRatio ?? 0, 0, 1) : 0;
  const studentCount = Math.round(attendance * ratio);
  const generalCount = Math.max(0, attendance - studentCount);
  const availableCount = Math.max(0, capacity - attendance);

  const sportKey = resolveSport(sport);
  const layout = SPORT_LAYOUTS[sportKey];

  const sections = useMemo(
    () => getSections(layout, clamp(fillRatio, 0, 1), showStudentSplit),
    [layout, fillRatio, showStudentSplit],
  );
  const footballSections = useMemo(
    () => (sportKey === "football" ? getFootballSections(attendance, safeCapacity, showStudentSplit) : []),
    [attendance, safeCapacity, showStudentSplit, sportKey],
  );

  return (
    <div
      className={`rounded-2xl border border-white/10 overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(120% 120% at 0% 0%, hsl(354 40% 18% / 0.35), transparent 40%), linear-gradient(140deg, hsl(220 18% 8%) 0%, hsl(224 20% 13%) 100%)",
      }}
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <span className="text-lg">{layout.icon}</span>
            {venueName}
          </div>
          <div className="text-xs text-[hsl(var(--muted-fg))]">{layout.label}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: fillPct >= 95 ? "hsl(var(--scarlet))" : "white" }}>
            {fillPct.toFixed(1)}%
          </div>
          <div className="text-xs text-[hsl(var(--muted-fg))]">{attendance.toLocaleString()} / {capacity.toLocaleString()}</div>
        </div>
      </div>

      <div className="relative p-4">
        <div className="relative w-full aspect-[4/3] max-w-[360px] mx-auto">
          <svg viewBox="0 0 260 190" className="w-full h-full">
            <rect x="18" y="16" width="224" height="158" rx="18" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />

            {sportKey === "football"
              ? footballSections.map((section) => (
                  <g key={section.index}>
                    <path
                      d={section.d}
                      fill={section.color}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="0.7"
                      opacity={0.4 + section.fill * 0.6}
                    />
                    {section.fill > 0.8 ? (
                      <circle cx={section.markerX} cy={section.markerY} r="2" fill="rgba(255,255,255,0.6)" />
                    ) : null}
                  </g>
                ))
              : sections.map((section) => (
                  <path
                    key={section.index}
                    d={section.d}
                    fill={section.color}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="0.7"
                    opacity={0.35 + section.fill * 0.65}
                  />
                ))}

            {sportKey !== "football" && (
              <ellipse cx={layout.centerX} cy={layout.centerY} rx={layout.innerRadius - 4} ry={(layout.innerRadius - 4) * layout.yScale} fill="rgba(7,10,18,0.4)" />
            )}

            <SportField sport={sportKey} />

            <text
              x="130"
              y="168"
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.6)"
              style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              {sportKey}
            </text>
          </svg>

          {fillPct >= 100 && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold bg-[hsl(var(--scarlet))] text-white animate-pulse">
              SELLOUT
            </div>
          )}
        </div>
      </div>

      {showStudentSplit ? (
        <div className="px-4 py-3 border-t border-white/10 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-[hsl(var(--scarlet))]">{studentCount.toLocaleString()}</div>
            <div className="text-[10px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">Students</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-300">{generalCount.toLocaleString()}</div>
            <div className="text-[10px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">General</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">{availableCount.toLocaleString()}</div>
            <div className="text-[10px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">Available</div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-white/10 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-[hsl(var(--scarlet))]">{attendance.toLocaleString()}</div>
            <div className="text-[10px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">Attendance</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">{fillPct.toFixed(1)}%</div>
            <div className="text-[10px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">Fill Rate</div>
          </div>
        </div>
      )}
    </div>
  );
}
