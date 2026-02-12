"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Home, BarChart3, GitCompare, FlaskConical, Target, Bookmark, Radio } from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Sports", icon: <Home className="w-5 h-5" /> },
  { href: "/dashboard", label: "Dashboard", icon: <Home className="w-5 h-5" /> },
  { href: "/games", label: "Team", icon: <BarChart3 className="w-5 h-5" /> },
  { href: "/compare", label: "Compare", icon: <GitCompare className="w-5 h-5" /> },
  { href: "/scenario", label: "Lab", icon: <FlaskConical className="w-5 h-5" /> },
  { href: "/calibration", label: "Calibration", icon: <Target className="w-5 h-5" /> },
  { href: "/scenarios", label: "Scenarios", icon: <Bookmark className="w-5 h-5" /> },
];

const QUICK_LINKS: NavItem[] = [
  { href: "/games/michigan_at_osu_2026", label: "Michigan Game", icon: <Radio className="w-4 h-4" /> },
  { href: "/games/michigan_at_osu_2026/live", label: "Live Mode", icon: <Radio className="w-4 h-4" /> },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sport = searchParams?.get("sport");

  const withSport = (href: string) => {
    if (!sport || href.includes("?")) return href;
    return `${href}?sport=${sport}`;
  };

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Hamburger button - only visible on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Drawer overlay and panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-80 md:hidden"
            >
              <div 
                className="h-full flex flex-col"
                style={{
                  background: "linear-gradient(135deg, hsl(220 15% 10%) 0%, hsl(220 18% 8%) 100%)",
                  borderLeft: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="display text-lg font-semibold">
                    <span className="text-[hsl(var(--scarlet))]">Menu</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation links */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {NAV_ITEMS.map((item, index) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={withSport(item.href)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all",
                            isActive(item.href)
                              ? "bg-[hsl(var(--scarlet))]/15 text-white"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-lg",
                            isActive(item.href) 
                              ? "bg-[hsl(var(--scarlet))]/20 text-[hsl(var(--scarlet))]" 
                              : "bg-white/5"
                          )}>
                            {item.icon}
                          </div>
                          <span className="font-semibold">{item.label}</span>
                          {isActive(item.href) && (
                            <motion.div
                              layoutId="mobile-nav-indicator"
                              className="ml-auto w-1.5 h-1.5 rounded-full bg-[hsl(var(--scarlet))]"
                            />
                          )}
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  {/* Quick links */}
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-3">
                      Quick Access
                    </div>
                    <div className="space-y-1">
                      {QUICK_LINKS.map((item) => (
                        <Link
                          key={item.href}
                          href={withSport(item.href)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all",
                            isActive(item.href)
                              ? "bg-[hsl(var(--scarlet))]/15 text-white"
                              : "text-white/60 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <div className="p-1.5 rounded-lg bg-white/5">
                            {item.icon}
                          </div>
                          <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Mock Data Active</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
