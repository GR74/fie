"use client";

import { type DataSourceEntry } from "@/lib/api";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  LIVE: { bg: "bg-green-500/15", text: "text-green-400", dot: "bg-green-400" },
  "REAL/ESTIMATED": { bg: "bg-blue-500/15", text: "text-blue-400", dot: "bg-blue-400" },
  HISTORICAL: { bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400" },
  MOCK: { bg: "bg-zinc-500/15", text: "text-zinc-400", dot: "bg-zinc-400" },
};

function getStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES["MOCK"];
}

export function DataBadge({ status, label }: { status: string; label?: string }) {
  const s = getStyle(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status === "LIVE" ? "animate-pulse" : ""}`} />
      {label ?? status}
    </span>
  );
}

export function DataSourceBar({ sources }: { sources: DataSourceEntry[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
      <span className="font-medium uppercase tracking-wider">Data:</span>
      {sources.map((src, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <DataBadge status={src.status} />
          <span className="text-zinc-500">{src.field}</span>
          <span className="text-zinc-600">({src.source})</span>
        </span>
      ))}
    </div>
  );
}

export function ModelStatusBadge() {
  return (
    <div className="flex items-center gap-2">
      <DataBadge status="MOCK" label="MOCK MODEL" />
      <span className="text-[10px] text-zinc-500">
        Coefficients calibrated to McMahon &amp; Quintanar (2024) &amp; Moskowitz &amp; Wertheim (2011)
      </span>
    </div>
  );
}

export function WeatherBadge({ source, temp, wind, conditions }: {
  source: string;
  temp: number;
  wind: number;
  conditions: string;
}) {
  const s = getStyle(source === "LIVE" ? "LIVE" : source === "HISTORICAL" ? "HISTORICAL" : "MOCK");
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${s.bg}`}>
      <DataBadge status={source} />
      <span className={`text-xs ${s.text}`}>
        {temp}°F | {wind} mph wind | {conditions}
      </span>
    </div>
  );
}
