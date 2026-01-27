"use client";

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";

export type CinematicTelemetry = {
  winDeltaPp: number; // percentage points
  decibels: number;
  opsUtil: number; // 0..2
};

type Ctx = {
  telemetry: CinematicTelemetry;
  setTelemetry: (t: Partial<CinematicTelemetry>) => void;
  quality: "high" | "low";
  setQuality: (q: "high" | "low") => void;
};

const TelemetryContext = createContext<Ctx | null>(null);

export function TelemetryProvider({ children }: PropsWithChildren) {
  const [telemetry, setTelemetryState] = useState<CinematicTelemetry>({
    winDeltaPp: 0,
    decibels: 95,
    opsUtil: 0.8,
  });

  const [quality, setQualityState] = useState<"high" | "low">(() => {
    if (typeof window === "undefined") return "high";
    const v = window.localStorage.getItem("cinematic_quality");
    return v === "low" ? "low" : "high";
  });

  // Stable callbacks to avoid infinite re-render loops
  const setTelemetry = useCallback((t: Partial<CinematicTelemetry>) => {
    setTelemetryState((prev) => ({ ...prev, ...t }));
  }, []);

  const setQuality = useCallback((q: "high" | "low") => {
    setQualityState(q);
    if (typeof window !== "undefined") window.localStorage.setItem("cinematic_quality", q);
  }, []);

  const value = useMemo<Ctx>(() => {
    return { telemetry, setTelemetry, quality, setQuality };
  }, [telemetry, setTelemetry, quality, setQuality]);

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error("useTelemetry must be used within TelemetryProvider");
  return ctx;
}


