"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='hero-header']",
    title: "Welcome to Fan Impact Engine",
    content: "This is your game day command center. Simulate attendance, atmosphere, and operations for any matchup.",
    position: "bottom",
  },
  {
    target: "[data-tour='presets']",
    title: "Quick Presets",
    content: "Start with one-click presets like 'Max Atmosphere' or 'Revenue Focus' to see instant scenarios.",
    position: "bottom",
  },
  {
    target: "[data-tour='controls']",
    title: "Fine-Tune Controls",
    content: "Use these sliders to adjust attendance, student ratio, crowd energy, and more. Watch the KPIs update in real-time.",
    position: "right",
  },
  {
    target: "[data-tour='kpis']",
    title: "Live KPI Dashboard",
    content: "See win probability, atmosphere metrics, and revenue projections update as you change inputs.",
    position: "left",
  },
  {
    target: "[data-tour='visualizations']",
    title: "Interactive Visualizations",
    content: "Explore stadium fill, concession operations, and performance gauges with rich visual modules.",
    position: "top",
  },
  {
    target: "[data-tour='recommendations']",
    title: "AI Recommendations",
    content: "Get contextual suggestions to optimize your game day setup based on current conditions.",
    position: "top",
  },
  {
    target: "[data-tour='shortcuts']",
    title: "Keyboard Shortcuts",
    content: "Press '?' anytime to see available shortcuts. Use Cmd+S to save scenarios, R to reset.",
    position: "bottom",
  },
];

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  hasSeenTour: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

interface OnboardingProviderProps {
  children: React.ReactNode;
  steps?: TourStep[];
}

export function OnboardingProvider({ children, steps = DEFAULT_TOUR_STEPS }: OnboardingProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true); // Default to true to not annoy returning users

  // Check localStorage on mount
  useEffect(() => {
    const seen = localStorage.getItem("fan-impact-tour-seen");
    if (!seen) {
      setHasSeenTour(false);
      // Auto-start tour for first-time users after a delay
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    setHasSeenTour(true);
    localStorage.setItem("fan-impact-tour-seen", "true");
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      endTour();
    }
  }, [currentStep, steps.length, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        startTour,
        endTour,
        nextStep,
        prevStep,
        hasSeenTour,
      }}
    >
      {children}
      <AnimatePresence>
        {isActive && (
          <TourOverlay
            steps={steps}
            currentStep={currentStep}
            onNext={nextStep}
            onPrev={prevStep}
            onClose={endTour}
          />
        )}
      </AnimatePresence>
    </OnboardingContext.Provider>
  );
}

interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

function TourOverlay({ steps, currentStep, onNext, onPrev, onClose }: TourOverlayProps) {
  const step = steps[currentStep];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const target = document.querySelector(step.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);
      // Scroll into view
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    switch (step.position) {
      case "top":
        return {
          top: `${targetRect.top - tooltipHeight - padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left - tooltipWidth - padding}px`,
          transform: "translateY(-50%)",
        };
      case "right":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding}px`,
          transform: "translateY(-50%)",
        };
      default:
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100]"
    >
      {/* Backdrop with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Highlight ring */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            border: "2px solid hsl(var(--scarlet))",
            borderRadius: 12,
            boxShadow: "0 0 20px hsl(var(--scarlet) / 0.5)",
          }}
        />
      )}

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute z-10 w-80 p-4 rounded-2xl"
        style={{
          ...getTooltipPosition(),
          background: "linear-gradient(135deg, hsl(220 15% 10%) 0%, hsl(220 18% 14%) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition"
        >
          <X className="w-4 h-4 text-white/50" />
        </button>

        {/* Content */}
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[hsl(var(--scarlet))]" />
          <h3 className="font-bold">{step.title}</h3>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">{step.content}</p>

        {/* Progress and navigation */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep
                    ? "bg-[hsl(var(--scarlet))] w-4"
                    : i < currentStep
                    ? "bg-white/40"
                    : "bg-white/20"
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={onPrev}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-white/10 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1"
              style={{
                background: "linear-gradient(135deg, hsl(var(--scarlet)) 0%, hsl(354 78% 30%) 100%)",
              }}
            >
              {currentStep === steps.length - 1 ? "Finish" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Tour trigger button component
export function TourTrigger({ className = "" }: { className?: string }) {
  const { startTour, hasSeenTour } = useOnboarding();

  return (
    <button
      onClick={startTour}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:bg-white/10 ${
        !hasSeenTour ? "animate-pulse bg-[hsl(var(--scarlet))]/20 text-[hsl(var(--scarlet))]" : "text-white/50"
      } ${className}`}
    >
      <Sparkles className="w-3 h-3" />
      Tour
    </button>
  );
}

