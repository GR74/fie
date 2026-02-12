"use client";

import { useEffect, useCallback } from "react";

export interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutAction[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;
      
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        // For Cmd/Ctrl shortcuts, accept either
        const cmdOrCtrl = shortcut.meta || shortcut.ctrl;
        const cmdOrCtrlMatch = cmdOrCtrl 
          ? (event.metaKey || event.ctrlKey)
          : (!event.metaKey && !event.ctrlKey);

        if (keyMatch && (cmdOrCtrl ? cmdOrCtrlMatch : (ctrlMatch && metaMatch)) && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Format shortcut for display
export function formatShortcut(shortcut: ShortcutAction): string {
  const parts: string[] = [];
  
  if (shortcut.meta || shortcut.ctrl) {
    // Show ⌘ on Mac, Ctrl on Windows
    parts.push(typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "⌘" : "Ctrl");
  }
  if (shortcut.shift) parts.push("⇧");
  if (shortcut.alt) parts.push("⌥");
  
  // Format key nicely
  let key = shortcut.key;
  if (key === " ") key = "Space";
  if (key === "Escape") key = "Esc";
  if (key.length === 1) key = key.toUpperCase();
  
  parts.push(key);
  
  return parts.join(" + ");
}

