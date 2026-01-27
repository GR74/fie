import type { PromotionType, SimulateOverrides } from "@/lib/api";

const BOOL_KEYS = new Set(["express_lanes", "early_arrival_promo"]);

export function parseOverridesFromSearchParams(
  params: URLSearchParams,
): SimulateOverrides {
  const o: SimulateOverrides = {};

  const num = (k: string) => {
    const v = params.get(k);
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const bool = (k: string) => {
    const v = params.get(k);
    if (v == null) return undefined;
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
    return undefined;
  };

  const promotion = params.get("promotion_type") as PromotionType | null;

  const maybeSet = <K extends keyof SimulateOverrides>(key: K, value: SimulateOverrides[K] | undefined) => {
    if (value !== undefined) o[key] = value;
  };

  maybeSet("attendance", num("attendance"));
  maybeSet("student_ratio", num("student_ratio"));
  maybeSet("weather_wind_mph", num("weather_wind_mph"));
  maybeSet("crowd_energy", num("crowd_energy"));
  maybeSet("stands_open_pct", num("stands_open_pct"));
  maybeSet("staff_per_stand", num("staff_per_stand"));

  if (promotion) o.promotion_type = promotion;

  for (const k of BOOL_KEYS) {
    const v = bool(k);
    if (v !== undefined) (o as any)[k] = v;
  }

  return o;
}

export function overridesToSearchParams(overrides: SimulateOverrides): URLSearchParams {
  const p = new URLSearchParams();
  const setNum = (k: string, v: number | undefined) => {
    if (v == null) return;
    p.set(k, String(v));
  };
  const setBool = (k: string, v: boolean | undefined) => {
    if (v == null) return;
    p.set(k, v ? "1" : "0");
  };

  setNum("attendance", overrides.attendance);
  setNum("student_ratio", overrides.student_ratio);
  setNum("weather_wind_mph", overrides.weather_wind_mph);
  setNum("crowd_energy", overrides.crowd_energy);
  setNum("stands_open_pct", overrides.stands_open_pct);
  setNum("staff_per_stand", overrides.staff_per_stand);

  if (overrides.promotion_type) p.set("promotion_type", overrides.promotion_type);

  setBool("express_lanes", overrides.express_lanes);
  setBool("early_arrival_promo", overrides.early_arrival_promo);

  return p;
}


