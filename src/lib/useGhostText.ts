"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface GhostTextState {
  isActive: boolean;
  ghostText: string;
  isLoading: boolean;
  error: string | null;
  accept: () => void;
  dismiss: () => void;
  reset: () => void;
}

interface UseGhostTextOptions {
  /** Pause duration in milliseconds before triggering ghost text (default: 3000) */
  pauseMs?: number;
  /** Callback to fetch suggestion based on context */
  onRequestSuggestion: (context: string, cursorPosition: number) => Promise<string | null>;
  /** Called when suggestion is accepted */
  onAccept?: (suggestion: string) => void;
  /** Enable/disable ghost text feature */
  enabled?: boolean;
}

/**
 * useGhostText - Hook to manage ghost text AI suggestions
 * 
 * Detects 3-second typing pauses and displays AI suggestions as
 * "ghost text" that can be accepted with Tab or dismissed with Esc.
 * 
 * @param content - Current editor content
 * @param cursorPosition - Current cursor position in content
 * @param options - Configuration options
 * @returns GhostTextState with current state and control functions
 */
export function useGhostText(
  content: string,
  cursorPosition: number,
  options: UseGhostTextOptions
): GhostTextState {
  const {
    pauseMs = 3000,
    onRequestSuggestion,
    onAccept,
    enabled = true,
  } = options;

  const [ghostText, setGhostText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Track the last content/position to detect changes
  const lastContentRef = useRef(content);
  const lastPositionRef = useRef(cursorPosition);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clear any pending timers and requests
  const clearPending = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Reset ghost text state
  const reset = useCallback(() => {
    clearPending();
    setGhostText("");
    setIsActive(false);
    setIsLoading(false);
    setError(null);
  }, [clearPending]);

  // Dismiss ghost text (Esc)
  const dismiss = useCallback(() => {
    reset();
  }, [reset]);

  // Accept ghost text (Tab)
  const accept = useCallback(() => {
    if (ghostText && onAccept) {
      onAccept(ghostText);
    }
    reset();
  }, [ghostText, onAccept, reset]);

  // Handle typing pause detection
  useEffect(() => {
    if (!enabled) {
      reset();
      return;
    }

    // Check if content or position changed
    const contentChanged = content !== lastContentRef.current;
    const positionChanged = cursorPosition !== lastPositionRef.current;

    lastContentRef.current = content;
    lastPositionRef.current = cursorPosition;

    // If something changed, reset and start new pause timer
    if (contentChanged || positionChanged) {
      // Clear any existing ghost text and timer
      clearPending();
      setGhostText("");
      setIsActive(false);
      setError(null);

      // Only trigger ghost text if:
      // 1. Content has actual text
      // 2. Cursor is at a position where ghost text makes sense
      const textBeforeCursor = content.substring(0, cursorPosition);
      const trimmedBefore = textBeforeCursor.trim();
      
      if (trimmedBefore.length < 10) {
        // Not enough context to suggest
        return;
      }

      // Start pause detection timer
      pauseTimerRef.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);

        try {
          abortControllerRef.current = new AbortController();
          const suggestion = await onRequestSuggestion(content, cursorPosition);
          
          if (suggestion && suggestion.trim()) {
            setGhostText(suggestion);
            setIsActive(true);
          }
        } catch (err) {
          if (err instanceof Error && err.name !== "AbortError") {
            setError(err.message);
          }
        } finally {
          setIsLoading(false);
        }
      }, pauseMs);
    }

    return () => {
      clearPending();
    };
  }, [content, cursorPosition, enabled, pauseMs, onRequestSuggestion, clearPending, reset]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isActive || !ghostText) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        accept();
      } else if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, ghostText, accept, dismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPending();
    };
  }, [clearPending]);

  return {
    isActive,
    ghostText,
    isLoading,
    error,
    accept,
    dismiss,
    reset,
  };
}

export default useGhostText;
