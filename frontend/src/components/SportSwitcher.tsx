"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/cn";
import { SPORT_SCOPES, getSportScope } from "@/lib/sports";

export function SportSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = getSportScope(searchParams?.get("sport"));

  const buildHref = (sportId: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("sport", sportId);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {SPORT_SCOPES.map((sport) => {
        const isActive = sport.id === active.id;
        return (
          <Link
            key={sport.id}
            href={buildHref(sport.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              isActive
                ? "border-[hsl(var(--scarlet))] bg-[hsl(var(--scarlet))]/20 text-[hsl(var(--scarlet))]"
                : "border-white/10 text-white/70 hover:border-white/30 hover:text-white",
            )}
          >
            {sport.shortLabel}
          </Link>
        );
      })}
    </div>
  );
}

export function SportHeader({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const active = getSportScope(searchParams?.get("sport"));

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {title}{" "}
            <span className="bg-gradient-to-b from-[hsl(var(--scarlet-2))] to-[hsl(var(--scarlet))] bg-clip-text text-transparent">
              {active.label}
            </span>
          </h1>
          {subtitle ? <p className="muted mt-1 text-sm">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="chip rounded-full px-3 py-1 text-[11px] font-semibold muted">
            {active.category}
          </span>
        </div>
      </div>
      <div className="glass-strong rounded-2xl border border-white/10 px-4 py-3 text-sm">
        <div className="font-semibold">{active.label} focus</div>
        <div className="muted mt-1">{active.description}</div>
        <SportSwitcher className="mt-3" />
      </div>
    </div>
  );
}

