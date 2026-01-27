"use client";

import { forwardRef, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/cn";

// Enhanced GlassCard with hover lift effect
export const GlassCard = forwardRef<
  HTMLDivElement, 
  React.HTMLAttributes<HTMLDivElement> & { 
    hover?: boolean;
    glow?: boolean;
  }
>(({ className, hover = true, glow = true, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn(
      "glass rounded-2xl",
      glow && "glass-border-glow",
      "will-change-transform",
      className,
    )}
    whileHover={hover ? { 
      y: -2, 
      boxShadow: "0 20px 40px hsl(var(--shadow-2)), 0 0 20px hsl(var(--glow))" 
    } : undefined}
    transition={{ duration: 0.2, ease: "easeOut" }}
    {...props}
  />
));
GlassCard.displayName = "GlassCard";

// Animated section title with subtle entrance
export function GlassSectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <motion.div 
      className="flex items-start justify-between gap-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        {subtitle ? <div className="muted mt-1 text-xs">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </motion.div>
  );
}

// Chip with subtle hover effect
export function Chip({ 
  children, 
  className = "",
  onClick,
}: { 
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.span 
      className={cn(
        "chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        onClick && "cursor-pointer",
        className,
      )}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
    >
      {children}
    </motion.span>
  );
}

// Enhanced button with press feedback and glow
export function GlassButton({
  variant = "ghost",
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <motion.button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        variant === "primary" && "btn-primary focus-visible:ring-[hsl(var(--scarlet))]",
        variant === "ghost" && "btn-ghost focus-visible:ring-white/30",
        variant === "danger" && "bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 focus-visible:ring-rose-500",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      animate={isPressed ? { scale: 0.97 } : { scale: 1 }}
      transition={{ duration: 0.1 }}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Animated control/input wrapper
export function Control({
  label,
  value,
  placeholder,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value?: number;
  placeholder?: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const actual = value ?? placeholder ?? min;
  return (
    <motion.div 
      className="space-y-2"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="muted font-medium">{label}</span>
        <motion.span 
          key={actual}
          initial={{ opacity: 0.5, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono font-semibold"
        >
          {format(actual)}
        </motion.span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={actual}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-slider w-full"
      />
    </motion.div>
  );
}

// Toggle switch with animation
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <motion.div
        className={cn(
          "relative w-10 h-6 rounded-full transition-colors duration-200",
          checked ? "bg-[hsl(var(--scarlet))]" : "bg-white/20"
        )}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
          animate={{ left: checked ? 20 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.div>
      <span className="text-xs font-medium muted group-hover:text-white/80 transition-colors">
        {label}
      </span>
    </label>
  );
}

// Subtle divider with fade
export function GlassDivider({ className = "" }: { className?: string }) {
  return (
    <motion.div 
      className={cn("h-px bg-gradient-to-r from-transparent via-white/20 to-transparent", className)}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.4 }}
    />
  );
}


