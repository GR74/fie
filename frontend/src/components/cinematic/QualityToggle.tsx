"use client";

import { GlassButton } from "@/components/ui/glass";
import { useTelemetry } from "@/components/cinematic/Telemetry";

export function QualityToggle() {
  const { quality, setQuality } = useTelemetry();
  return (
    <GlassButton
      type="button"
      onClick={() => setQuality(quality === "high" ? "low" : "high")}
      title="Toggle cinematic quality"
    >
      Quality: {quality === "high" ? "High" : "Low"}
    </GlassButton>
  );
}


