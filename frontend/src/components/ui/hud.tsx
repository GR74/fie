import { cn } from "@/lib/cn";

export function HudDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-px w-full",
        "bg-gradient-to-r from-transparent via-white/20 to-transparent",
        className,
      )}
    />
  );
}

export function StatBar({
  label,
  value,
  sub,
  tone = "scarlet",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "scarlet" | "neutral" | "good" | "bad";
}) {
  const toneClass =
    tone === "scarlet"
      ? "from-[hsl(var(--scarlet))] to-transparent"
      : tone === "good"
        ? "from-emerald-400/70 to-transparent"
        : tone === "bad"
          ? "from-rose-400/70 to-transparent"
          : "from-white/35 to-transparent";

  return (
    <div className="glass-strong rounded-2xl border border-white/10 p-4">
      <div className="muted text-[11px] uppercase tracking-[0.16em]">{label}</div>
      <div className="mt-1 display text-3xl font-semibold leading-none">{value}</div>
      {sub ? <div className="muted mt-1 text-xs">{sub}</div> : null}
      <div className="mt-3 h-[2px] w-full bg-white/10">
        <div className={cn("h-[2px] w-1/2 bg-gradient-to-r", toneClass)} />
      </div>
    </div>
  );
}


