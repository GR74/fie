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

export function StadiumFillViz({
  attendance,
  capacity,
  studentRatio,
  showStudentSplit = true,
  venueName = "Ohio Stadium",
  sport = "football",
  className = "",
}: StadiumFillVizProps) {
  const fillPct = Math.min(100, (attendance / capacity) * 100);
  const ratio = showStudentSplit ? studentRatio ?? 0 : 0;
  const studentCount = Math.round(attendance * ratio);
  const generalCount = attendance - studentCount;

  // Generate horseshoe stadium sections
  const sections = useMemo(() => {
    const numSections = 24;
    const seatsPerSection = Math.ceil(capacity / numSections);
    const filledTotal = attendance;
    
    return Array.from({ length: numSections }, (_, i) => {
      const angle = (i / numSections) * Math.PI + Math.PI / 2;
      const sectionStart = i * seatsPerSection;
      const sectionEnd = Math.min((i + 1) * seatsPerSection, capacity);
      const sectionCapacity = sectionEnd - sectionStart;
      
      // Calculate how many seats in this section are filled
      const filledInSection = Math.min(
        sectionCapacity,
        Math.max(0, filledTotal - sectionStart)
      );
      const fillRatio = filledInSection / sectionCapacity;
      
      // Student sections are typically in specific areas (south end zone area)
      const isStudentSection = i >= 10 && i <= 14;
      
      return {
        id: i,
        angle,
        fillRatio,
        isStudentSection,
        capacity: sectionCapacity,
        filled: filledInSection,
      };
    });
  }, [attendance, capacity]);

  const sportEmoji =
    sport === "basketball"
      ? "🏀"
      : sport === "volleyball"
        ? "🏐"
        : sport === "baseball"
          ? "⚾"
          : sport === "soccer"
            ? "⚽"
            : "🏟️";

  return (
    <div className={`rounded-2xl border border-white/10 overflow-hidden ${className}`} style={{
      background: "linear-gradient(135deg, hsl(220 15% 8%) 0%, hsl(220 18% 12%) 100%)"
    }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <span className="text-lg">{sportEmoji}</span>
            {venueName}
          </div>
          <div className="text-xs text-[hsl(var(--muted-fg))]">
            {capacity.toLocaleString()} capacity
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: fillPct >= 95 ? "hsl(var(--scarlet))" : "white" }}>
            {fillPct.toFixed(1)}%
          </div>
          <div className="text-xs text-[hsl(var(--muted-fg))]">
            {attendance.toLocaleString()} fans
          </div>
        </div>
      </div>

      {/* Stadium Visualization */}
      <div className="relative p-4">
        <div className="relative w-full aspect-[4/3] max-w-[320px] mx-auto">
          {/* Stadium bowl SVG */}
          <svg viewBox="0 0 200 150" className="w-full h-full">
            {sport === "basketball" ? (
              <>
                {/* Basketball court */}
                <rect x="40" y="45" width="120" height="80" fill="#c45c3e" stroke="#8B4513" strokeWidth="2" rx="2" />
                <circle cx="100" cy="85" r="25" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
                <circle cx="100" cy="85" r="4" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
                <line x1="100" y1="45" x2="100" y2="125" stroke="white" strokeWidth="1" opacity="0.6" />
                <rect x="40" y="65" width="20" height="40" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
                <rect x="140" y="65" width="20" height="40" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
                <text x="100" y="88" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" opacity="0.4">OSU</text>
              </>
            ) : sport === "volleyball" ? (
              <>
                {/* Volleyball court */}
                <rect x="35" y="45" width="130" height="80" fill="#b87a4a" stroke="#8B4513" strokeWidth="2" rx="2" />
                <line x1="100" y1="45" x2="100" y2="125" stroke="white" strokeWidth="1" opacity="0.7" />
                <rect x="35" y="45" width="130" height="80" fill="none" stroke="white" strokeWidth="1" opacity="0.4" />
                <line x1="35" y1="85" x2="165" y2="85" stroke="white" strokeWidth="1" opacity="0.4" />
                <text x="100" y="88" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" opacity="0.4">OSU</text>
              </>
            ) : sport === "baseball" ? (
              <>
                {/* Baseball diamond */}
                <polygon points="100,55 140,85 100,115 60,85" fill="#1a4d1a" stroke="#2d6b2d" strokeWidth="2" />
                <circle cx="100" cy="85" r="4" fill="#d2b48c" />
                <circle cx="100" cy="55" r="3" fill="#d2b48c" />
                <circle cx="140" cy="85" r="3" fill="#d2b48c" />
                <circle cx="60" cy="85" r="3" fill="#d2b48c" />
                <text x="100" y="140" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" opacity="0.35">OSU</text>
              </>
            ) : sport === "soccer" ? (
              <>
                {/* Soccer pitch */}
                <rect x="40" y="50" width="120" height="70" fill="#1a4d1a" stroke="#2d6b2d" strokeWidth="2" />
                <line x1="100" y1="50" x2="100" y2="120" stroke="white" strokeWidth="1" opacity="0.6" />
                <circle cx="100" cy="85" r="16" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
                <rect x="40" y="72" width="18" height="26" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
                <rect x="142" y="72" width="18" height="26" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
                <text x="100" y="90" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" opacity="0.3">OSU</text>
              </>
            ) : (
              <>
                {/* Football field */}
                <ellipse cx="100" cy="85" rx="55" ry="35" fill="#1a4d1a" stroke="#2d6b2d" strokeWidth="2" />
                {[...Array(5)].map((_, i) => (
                  <line key={i} x1={60 + i * 20} y1="60" x2={60 + i * 20} y2="110" stroke="white" strokeWidth="0.5" opacity="0.4" />
                ))}
                <circle cx="100" cy="85" r="8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4" />
                <path d="M 45 65 Q 45 85, 45 105 L 55 100 L 55 70 Z" fill="hsl(var(--scarlet))" opacity="0.7" />
                <path d="M 155 65 Q 155 85, 155 105 L 145 100 L 145 70 Z" fill="#666" opacity="0.5" />
                <text x="100" y="88" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white" opacity="0.3">OSU</text>
              </>
            )}
            
            {/* Stadium sections (horseshoe shape) */}
            {sections.map((section) => {
              const innerRadius = 60;
              const outerRadius = 90;
              const startAngle = section.angle - Math.PI / 26;
              const endAngle = section.angle + Math.PI / 26;
              
              const x1 = 100 + Math.cos(startAngle) * innerRadius;
              const y1 = 85 + Math.sin(startAngle) * innerRadius * 0.6;
              const x2 = 100 + Math.cos(endAngle) * innerRadius;
              const y2 = 85 + Math.sin(endAngle) * innerRadius * 0.6;
              const x3 = 100 + Math.cos(endAngle) * outerRadius;
              const y3 = 85 + Math.sin(endAngle) * outerRadius * 0.6;
              const x4 = 100 + Math.cos(startAngle) * outerRadius;
              const y4 = 85 + Math.sin(startAngle) * outerRadius * 0.6;
              
              // Skip bottom sections (open end of horseshoe)
              if (section.id >= 0 && section.id <= 4) return null;
              if (section.id >= 20 && section.id <= 23) return null;
              
              const fillColor = section.isStudentSection 
                ? `hsl(354 78% ${35 + section.fillRatio * 25}%)`
                : `hsl(220 ${10 + section.fillRatio * 5}% ${25 + section.fillRatio * 45}%)`;
              
              return (
                <g key={section.id}>
                  <path
                    d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`}
                    fill={section.fillRatio > 0 ? fillColor : "#1a1a1a"}
                    stroke="hsl(220 15% 20%)"
                    strokeWidth="0.5"
                    opacity={0.4 + section.fillRatio * 0.6}
                  >
                    <title>
                      Section {section.id + 1}: {(section.fillRatio * 100).toFixed(0)}% full
                      {section.isStudentSection ? " (Student Section)" : ""}
                    </title>
                  </path>
                  {section.fillRatio > 0.8 && (
                    <circle
                      cx={(x1 + x2 + x3 + x4) / 4}
                      cy={(y1 + y2 + y3 + y4) / 4}
                      r="2"
                      fill="white"
                      opacity="0.6"
                    />
                  )}
                </g>
              );
            })}
            
            {/* Glow effect for high attendance */}
            {fillPct >= 90 && (
              <ellipse 
                cx="100" 
                cy="85" 
                rx="85" 
                ry="55" 
                fill="none" 
                stroke="hsl(var(--scarlet))" 
                strokeWidth="2"
                opacity="0.3"
                style={{ filter: "blur(4px)" }}
              />
            )}
          </svg>
          
          {/* Sellout badge */}
          {fillPct >= 100 && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold bg-[hsl(var(--scarlet))] text-white animate-pulse">
              SELLOUT!
            </div>
          )}
        </div>
      </div>

      {/* Stats footer */}
      {showStudentSplit ? (
        <div className="px-4 py-3 border-t border-white/10 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-[hsl(var(--scarlet))]">
              {studentCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">
              Students
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-300">
              {generalCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">
              General
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {(capacity - attendance).toLocaleString()}
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">
              Available
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-white/10 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-[hsl(var(--scarlet))]">
              {attendance.toLocaleString()}
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">
              Attendance
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {fillPct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-fg))] uppercase tracking-wider">
              Fill Rate
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
