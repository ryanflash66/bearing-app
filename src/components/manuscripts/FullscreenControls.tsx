"use client";

import { useState, useCallback } from "react";
import { AutosaveState } from "@/lib/useAutosave";

interface FullscreenControlsProps {
  onExit: () => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
  autosaveState: AutosaveState;
  onSaveNow?: () => Promise<boolean>;
  disabled?: boolean;
}

// Inline AutosaveIndicator for fullscreen mode (simplified display)
function AutosaveIndicator({
  state,
  onSaveNow,
  disabled = false,
}: {
  state: AutosaveState;
  onSaveNow?: () => Promise<boolean>;
  disabled?: boolean;
}) {
  const [isManualSaving, setIsManualSaving] = useState(false);

  const handleSaveNow = async () => {
    if (!onSaveNow || isManualSaving || disabled) return;
    setIsManualSaving(true);
    try {
      await onSaveNow();
    } finally {
      setIsManualSaving(false);
    }
  };

  const getStatusDisplay = () => {
    switch (state.status) {
      case "saving":
        return (
          <span className="flex items-center gap-2 text-amber-600">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Saving...
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-2 text-emerald-600">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Saved{" "}
            {state.lastSavedAt &&
              `at ${state.lastSavedAt.toLocaleTimeString()}`}
          </span>
        );
      case "error":
        if (state.maxRetriesExceeded) {
          return (
            <span className="flex items-center gap-2 text-red-600">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Save failed
              {onSaveNow && (
                <button
                  onClick={handleSaveNow}
                  disabled={isManualSaving || disabled}
                  className="ml-2 px-2 py-1 text-xs font-medium rounded bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Click to retry saving"
                >
                  {isManualSaving ? (
                    <>
                      <svg
                        className="h-3 w-3 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Now"
                  )}
                </button>
              )}
            </span>
          );
        } else if (state.retryingIn !== null && state.retryingIn > 0) {
          return (
            <span className="flex items-center gap-2 text-amber-600">
              <svg
                className="h-4 w-4 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Retrying in {state.retryingIn}s...
            </span>
          );
        } else {
          return (
            <span className="flex items-center gap-2 text-amber-600">
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Retrying... (attempt {state.retryCount})
            </span>
          );
        }
      case "offline":
        return (
          <span className="flex items-center gap-2 text-slate-500">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            Offline
          </span>
        );
      case "conflict":
        return (
          <span className="flex items-center gap-2 text-orange-600">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Conflict
          </span>
        );
      default:
        return state.pendingChanges ? (
          <span className="text-slate-600">Unsaved</span>
        ) : (
          <span className="text-slate-500">Ready</span>
        );
    }
  };

  return <div className="text-sm">{getStatusDisplay()}</div>;
}

export default function FullscreenControls({
  onExit,
  onToggleTheme,
  isDarkMode,
  autosaveState,
  onSaveNow,
  disabled = false,
}: FullscreenControlsProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <>
      {/* Hover trigger area - transparent bar at top of screen */}
      <div
        className="fixed top-0 left-0 right-0 h-4 z-50"
        onMouseEnter={handleMouseEnter}
        data-testid="fullscreen-hover-trigger"
        aria-hidden="true"
      />

      {/* Controls container */}
      <div
        className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg backdrop-blur-md transition-all duration-200 ${
          isDarkMode
            ? "border-slate-700 bg-slate-800/90 text-slate-200"
            : "border-slate-200 bg-white/90 text-slate-600"
        } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-testid="fullscreen-controls"
      >
        <div
          className={`mr-2 border-r pr-3 ${isDarkMode ? "border-slate-600" : "border-slate-200"}`}
        >
          <AutosaveIndicator
            state={autosaveState}
            onSaveNow={onSaveNow}
            disabled={disabled}
          />
        </div>

        {/* Theme toggle button */}
        <button
          onClick={onToggleTheme}
          className={`rounded-full p-1.5 transition-colors ${
            isDarkMode
              ? "hover:bg-slate-700 text-yellow-400"
              : "hover:bg-slate-100 text-slate-500"
          }`}
          title={isDarkMode ? "Switch to Light Mode" : "Toggle Dark Mode"}
          aria-label={isDarkMode ? "Switch to Light Mode" : "Toggle Dark Mode"}
        >
          {isDarkMode ? (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        {/* Exit fullscreen button */}
        <button
          onClick={onExit}
          className={`rounded-full p-1.5 transition-colors ${
            isDarkMode
              ? "hover:bg-red-900/50 hover:text-red-400"
              : "hover:bg-red-50 hover:text-red-600"
          }`}
          title="Exit Fullscreen (Esc)"
          aria-label="Exit Fullscreen"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Keyboard shortcut hint */}
        <div
          className={`ml-2 border-l pl-3 text-xs ${isDarkMode ? "border-slate-600 text-slate-400" : "border-slate-200 text-slate-400"}`}
        >
          <kbd className={`rounded px-1 py-0.5 ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}>
            Esc
          </kbd>{" "}
          to exit
        </div>
      </div>
    </>
  );
}
