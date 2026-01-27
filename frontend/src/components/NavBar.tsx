"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  match?: RegExp;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/games", label: "Team", match: /^\/games(?!\/.*\/live)/ },
  { href: "/compare", label: "Compare" },
  { href: "/scenario", label: "Lab" },
  { href: "/calibration", label: "Calibration" },
  { href: "/scenarios", label: "Scenarios" },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link href={item.href} className="relative">
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

  const isActive = (item: NavItem) => {
    if (item.match) {
      return item.match.test(pathname);
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} item={item} isActive={isActive(item)} />
      ))}
    </nav>
  );
}

// Logo with hover glow effect
export function Logo() {
  return (
    <Link href="/games/michigan_at_osu_2026" className="group">
      <motion.div 
        className="flex items-baseline gap-2"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <div className="display text-xl font-semibold tracking-tight">
          Fan Impact{" "}
          <motion.span 
            className="bg-gradient-to-b from-[hsl(var(--scarlet-2))] to-[hsl(var(--scarlet))] bg-clip-text text-transparent"
            whileHover={{ 
              textShadow: "0 0 20px hsl(var(--scarlet) / 0.5)",
            }}
          >
            Engine
          </motion.span>
        </div>
        <span className="hidden rounded-full bg-white/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-black/70 dark:bg-white/10 dark:text-white/70 md:inline">
          OhioState-inspired
        </span>
      </motion.div>
      <motion.div 
        className="muted mt-0.5 text-[11px]"
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
      >
        Locker room → tunnel → arena
      </motion.div>
    </Link>
  );
}

// Status chips with subtle animation
export function StatusChips() {
  return (
    <div className="hidden items-center gap-2 text-xs sm:flex">
      <motion.span 
        className="chip rounded-full px-3 py-1 muted"
        title="Mock dataset"
        whileHover={{ scale: 1.02 }}
      >
        Data: Mock
      </motion.span>
      <motion.span 
        className="chip rounded-full px-3 py-1 muted"
        title="Mock engine"
        whileHover={{ scale: 1.02 }}
      >
        Model: Mock
      </motion.span>
    </div>
  );
}

