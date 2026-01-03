"use client";

import { useState, useEffect, useCallback } from "react";

export interface ZenModeState {
  isActive: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

const ZEN_MODE_STORAGE_KEY = "bearing-zen-mode";

/**
 * useZenMode - Hook to manage Zen Mode state with localStorage persistence
 * 
 * Zen Mode provides a distraction-free writing experience by:
 * - Collapsing sidebars
 * - Centering the canvas
 * - Hiding non-essential UI elements
 * 
 * @returns ZenModeState with current state and control functions
 */
export function useZenMode(): ZenModeState {
  const [isActive, setIsActive] = useState(false);

  // Load initial state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(ZEN_MODE_STORAGE_KEY);
      if (stored === "true") {
        setIsActive(true);
      }
    }
  }, []);

  // Persist state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ZEN_MODE_STORAGE_KEY, String(isActive));
    }
  }, [isActive]);

  // Handle keyboard shortcut: Cmd+\ (Mac) or Ctrl+\ (Windows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+\ (Mac) or Ctrl+\ (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setIsActive((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggle = useCallback(() => {
    setIsActive((prev) => !prev);
  }, []);

  const enable = useCallback(() => {
    setIsActive(true);
  }, []);

  const disable = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    isActive,
    toggle,
    enable,
    disable,
  };
}

export default useZenMode;
