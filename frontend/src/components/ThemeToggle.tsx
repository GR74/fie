"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  // Determine resolved theme based on system preference
  useEffect(() => {
    const stored = localStorage.getItem("fan-impact-theme") as Theme | null;
    if (stored) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const updateFromSystem = () => {
        const isDark = mediaQuery.matches;
        setResolvedTheme(isDark ? "dark" : "light");
        root.classList.toggle("dark", isDark);
        root.classList.toggle("light", !isDark);
      };
      
      updateFromSystem();
      mediaQuery.addEventListener("change", updateFromSystem);
      return () => mediaQuery.removeEventListener("change", updateFromSystem);
    } else {
      setResolvedTheme(theme);
      root.classList.toggle("dark", theme === "dark");
      root.classList.toggle("light", theme === "light");
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("fan-impact-theme", newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun className="w-3.5 h-3.5" />, label: "Light" },
    { value: "dark", icon: <Moon className="w-3.5 h-3.5" />, label: "Dark" },
    { value: "system", icon: <Monitor className="w-3.5 h-3.5" />, label: "System" },
  ];

  return (
    <div className={`flex items-center p-1 rounded-xl bg-white/5 border border-white/10 ${className}`}>
      {themes.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`relative px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            theme === value
              ? "text-white"
              : "text-white/50 hover:text-white/70"
          }`}
          title={label}
        >
          {theme === value && (
            <motion.div
              layoutId="theme-indicator"
              className="absolute inset-0 rounded-lg bg-white/10"
              transition={{ type: "spring", duration: 0.3 }}
            />
          )}
          <span className="relative z-10">{icon}</span>
          <span className="relative z-10 hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

// Compact toggle for mobile
export function ThemeToggleCompact({ className = "" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <button
      onClick={cycleTheme}
      className={`p-2 rounded-lg hover:bg-white/10 transition ${className}`}
      title={`Theme: ${theme}`}
    >
      <motion.div
        key={resolvedTheme}
        initial={{ scale: 0.8, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.3 }}
      >
        {resolvedTheme === "dark" ? (
          <Moon className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4" />
        )}
      </motion.div>
    </button>
  );
}

