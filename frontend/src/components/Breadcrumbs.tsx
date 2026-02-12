"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/cn";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

// Auto-generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  
  let currentPath = "";
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Format segment label
    let label = segment
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    
    // Handle special cases
    if (segment === "games") label = "Games";
    if (segment === "dashboard") label = "Dashboard";
    if (segment === "compare") label = "Compare";
    if (segment === "scenario") label = "Lab";
    if (segment === "calibration") label = "Calibration";
    if (segment === "scenarios") label = "Scenarios";
    if (segment === "sensitivity") label = "Sensitivity";
    if (segment === "engine") label = "Engine";
    if (segment === "engine-report") label = "Report";
    if (segment === "live") label = "Live";
    
    const isLast = i === segments.length - 1;
    
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }
  
  return breadcrumbs;
}

export function Breadcrumbs({ items, className = "", showHome = true }: BreadcrumbsProps) {
  const pathname = usePathname();
  const breadcrumbs = items || generateBreadcrumbs(pathname);

  if (breadcrumbs.length === 0) return null;

  return (
    <motion.nav
      className={cn("flex items-center gap-1 text-xs", className)}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-label="Breadcrumb"
    >
      {/* Home link */}
      {showHome && (
        <>
          <Link 
            href="/"
            className="p-1 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white/80"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
          <ChevronRight className="w-3 h-3 text-white/30" />
        </>
      )}

      {/* Breadcrumb items */}
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <motion.div
            key={item.label}
            className="flex items-center gap-1"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            {item.href ? (
              <Link
                href={item.href}
                className="px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white/80"
              >
                {item.label}
              </Link>
            ) : (
              <span className="px-1.5 py-0.5 font-medium text-white/90">
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <ChevronRight className="w-3 h-3 text-white/30" />
            )}
          </motion.div>
        );
      })}
    </motion.nav>
  );
}

// Minimal breadcrumb for inline use
export function InlineBreadcrumb({ 
  items,
  className = "",
}: { 
  items: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 text-xs text-white/50", className)}>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {item.href ? (
            <Link href={item.href} className="hover:text-white/80 hover:underline transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-white/80 font-medium">{item.label}</span>
          )}
          {index < items.length - 1 && <span>/</span>}
        </span>
      ))}
    </div>
  );
}

