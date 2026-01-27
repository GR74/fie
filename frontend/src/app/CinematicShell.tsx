"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { PropsWithChildren, useEffect, useMemo, createContext, useContext } from "react";

import { CinematicCanvas } from "@/components/cinematic/CinematicCanvas";

// Context for stagger delays
const StaggerContext = createContext(0);
export const useStaggerDelay = () => useContext(StaggerContext);

export function CinematicShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  // Weighted scroll rig
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.0,
      lerp: 0.08,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [reduce]);

  // Enhanced page transition variants
  const variants = useMemo(() => {
    if (reduce) {
      return {
        initial: { opacity: 0 },
        enter: { opacity: 1, transition: { duration: 0.12 } },
        exit: { opacity: 0, transition: { duration: 0.08 } },
      };
    }

    return {
      initial: {
        opacity: 0,
        y: 20,
        filter: "blur(8px)",
      },
      enter: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94],
          staggerChildren: 0.05,
          delayChildren: 0.1,
        },
      },
      exit: {
        opacity: 0,
        y: -10,
        filter: "blur(4px)",
        transition: {
          duration: 0.2,
          ease: [0.4, 0, 0.6, 1],
        },
      },
    };
  }, [reduce]);

  return (
    <>
      <CinematicCanvas />

      {/* Impact streak overlay (reacts during page transitions) */}
      <div className="pointer-events-none fixed inset-0 z-[70] opacity-60 mix-blend-screen">
        <div className="impact-streak" />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          variants={variants}
          initial="initial"
          animate="enter"
          exit="exit"
          className="page-content"
        >
          <StaggerContext.Provider value={0}>
            {children}
          </StaggerContext.Provider>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// Stagger container for child animations
export function StaggerContainer({ 
  children, 
  className = "",
  staggerDelay = 0.05,
}: PropsWithChildren<{ 
  className?: string;
  staggerDelay?: number;
}>) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: reduce ? 0 : staggerDelay,
          },
        },
      }}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

// Stagger item that animates in sequence
export function StaggerItem({ 
  children, 
  className = "",
  index = 0,
}: PropsWithChildren<{ 
  className?: string;
  index?: number;
}>) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { 
          opacity: 0, 
          y: reduce ? 0 : 16,
          scale: reduce ? 1 : 0.98,
        },
        show: { 
          opacity: 1, 
          y: 0,
          scale: 1,
          transition: {
            duration: 0.35,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Fade in on scroll (intersection observer based)
export function FadeInOnScroll({ 
  children, 
  className = "",
  threshold = 0.1,
}: PropsWithChildren<{ 
  className?: string;
  threshold?: number;
}>) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: threshold }}
      transition={{ 
        duration: 0.5, 
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
    >
      {children}
    </motion.div>
  );
}


