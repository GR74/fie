"use client";

import { useState, useCallback, useRef } from "react";

interface UseUndoRedoOptions<T> {
  maxHistory?: number;
}

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (initialState: T) => void;
  historyLength: number;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions<T> = {}
): UseUndoRedoReturn<T> {
  const { maxHistory = 50 } = options;

  const [state, setStateInternal] = useState<T>(initialState);
  const historyRef = useRef<T[]>([initialState]);
  const indexRef = useRef(0);

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const resolved = typeof newState === "function"
          ? (newState as (prev: T) => T)(prev)
          : newState;

        // Don't add to history if state hasn't changed
        if (JSON.stringify(resolved) === JSON.stringify(prev)) {
          return prev;
        }

        // Trim future history when making new changes
        const newHistory = historyRef.current.slice(0, indexRef.current + 1);
        newHistory.push(resolved);

        // Limit history size
        if (newHistory.length > maxHistory) {
          newHistory.shift();
        } else {
          indexRef.current++;
        }

        historyRef.current = newHistory;
        return resolved;
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    if (indexRef.current > 0) {
      indexRef.current--;
      setStateInternal(historyRef.current[indexRef.current]);
    }
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current++;
      setStateInternal(historyRef.current[indexRef.current]);
    }
  }, []);

  const reset = useCallback((initialState: T) => {
    historyRef.current = [initialState];
    indexRef.current = 0;
    setStateInternal(initialState);
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    historyLength: historyRef.current.length,
  };
}

