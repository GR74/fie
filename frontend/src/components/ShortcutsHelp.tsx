"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { formatShortcut, type ShortcutAction } from "@/hooks/useKeyboardShortcuts";

interface ShortcutsHelpProps {
  shortcuts: ShortcutAction[];
}

export function ShortcutsHelp({ shortcuts }: ShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for ? key to open help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-white/10 transition text-white/50 hover:text-white/80"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="w-4 h-4" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div
                className="rounded-2xl border border-white/10 overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(220 15% 10%) 0%, hsl(220 18% 14%) 100%)",
                  boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-[hsl(var(--scarlet))]" />
                    <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Shortcuts list */}
                <div className="p-4 space-y-1 max-h-80 overflow-y-auto">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5"
                    >
                      <span className="text-sm text-white/70">{shortcut.description}</span>
                      <kbd className="px-2 py-1 rounded bg-white/10 text-xs font-mono font-semibold text-white/90">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 text-center">
                  <span className="text-xs text-white/40">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 mx-1">?</kbd> to toggle this menu
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Global shortcuts indicator component
export function ShortcutsIndicator() {
  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-xs text-white/50">
        Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/70 mx-1">?</kbd> for shortcuts
      </div>
    </div>
  );
}

