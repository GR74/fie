"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  match?: RegExp;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Sports", match: /^\/$/ },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/games", label: "Team", match: /^\/games(?!\/.*\/live)/ },
  { href: "/compare", label: "Compare" },
];

const MORE_NAV: NavItem[] = [
  { href: "/scenario", label: "Lab" },
  { href: "/calibration", label: "Calibration" },
  { href: "/scenarios", label: "Scenarios" },
];

function NavLink({ item, href, isActive }: { item: NavItem; href?: string; isActive: boolean }) {
  return (
    <Link href={href ?? item.href} className="relative">
      <motion.div
        className={cn(
          "relative px-3 py-2 rounded-full text-xs font-semibold transition-colors",
          isActive 
            ? "text-white" 
            : "text-white/60 hover:text-white/90"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Background on hover/active */}
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={false}
          animate={{
            backgroundColor: isActive 
              ? "hsla(354, 78%, 45%, 0.2)" 
              : "transparent",
          }}
          whileHover={{
            backgroundColor: isActive 
              ? "hsla(354, 78%, 45%, 0.25)" 
              : "hsla(0, 0%, 100%, 0.08)",
          }}
          transition={{ duration: 0.15 }}
        />
        
        {/* Label */}
        <span className="relative z-10">{item.label}</span>
        
        {/* Active indicator dot */}
        {isActive && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute -bottom-1 left-1/2 w-1 h-1 rounded-full bg-[hsl(var(--scarlet))]"
            style={{ x: "-50%" }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </motion.div>
    </Link>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sport = searchParams?.get("sport");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const withSport = (href: string) => {
    if (!sport || href.includes("?")) return href;
    return `${href}?sport=${sport}`;
  };

  const isActive = (item: NavItem) => {
    if (item.match) {
      return item.match.test(pathname);
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const isMoreActive = MORE_NAV.some((item) => isActive(item));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      {PRIMARY_NAV.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          href={withSport(item.href)}
          isActive={isActive(item)}
        />
      ))}
      <div className="relative" ref={moreRef}>
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className={cn(
            "relative px-3 py-2 rounded-full text-xs font-semibold transition-colors flex items-center gap-1",
            isMoreActive ? "text-white" : "text-white/60 hover:text-white/90"
          )}
          aria-expanded={moreOpen}
          aria-haspopup="true"
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={false}
            animate={{
              backgroundColor: isMoreActive
                ? "hsla(354, 78%, 45%, 0.2)"
                : moreOpen
                  ? "hsla(0, 0%, 100%, 0.1)"
                  : "transparent",
            }}
            transition={{ duration: 0.15 }}
          />
          <span className="relative z-10">More</span>
          <ChevronDown
            className={cn("relative z-10 w-3.5 h-3.5 transition-transform", moreOpen && "rotate-180")}
          />
        </button>
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1 py-1.5 min-w-[140px] rounded-xl border border-white/10 bg-[hsl(220,18%,10%)] shadow-xl z-50"
            >
              {MORE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={withSport(item.href)}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "block px-4 py-2 text-xs font-medium transition-colors rounded-lg mx-1",
                    isActive(item)
                      ? "text-[hsl(var(--scarlet))] bg-[hsl(var(--scarlet))]/10"
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

// Logo — single line to reduce header clutter
export function Logo() {
  return (
    <Link href="/" className="group flex-shrink-0">
      <motion.div
        className="display text-lg font-semibold tracking-tight"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        Fan Impact{" "}
        <span className="bg-gradient-to-b from-[hsl(var(--scarlet-2))] to-[hsl(var(--scarlet))] bg-clip-text text-transparent">
          Engine
        </span>
      </motion.div>
    </Link>
  );
}

// Single compact status chip
export function StatusChips() {
  return (
    <span
      className="hidden rounded-full px-2.5 py-1 text-[11px] text-white/50 sm:inline"
      title="Mock data and model"
    >
      Mock
    </span>
  );
}
