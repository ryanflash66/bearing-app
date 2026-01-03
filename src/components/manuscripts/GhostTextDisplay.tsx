"use client";

import { memo } from "react";

interface GhostTextDisplayProps {
  /** The ghost text suggestion to display */
  text: string;
  /** Whether the ghost text is currently visible */
  isVisible: boolean;
  /** Whether the suggestion is loading */
  isLoading?: boolean;
  /** Position offset from cursor (for inline display in rich editors) */
  className?: string;
}

/**
 * GhostTextDisplay - Renders AI suggestion as ghost text
 * 
 * Uses SF Mono font with muted styling per UX spec.
 * Displays inline after cursor position with fade animation.
 */
export const GhostTextDisplay = memo(function GhostTextDisplay({
  text,
  isVisible,
  isLoading = false,
  className = "",
}: GhostTextDisplayProps) {
  if (!isVisible && !isLoading) return null;

  return (
    <span
      className={`ghost-text-container ${className}`}
      aria-hidden="true"
      data-testid="ghost-text"
    >
      {isLoading ? (
        <span className="ghost-text-loading">
          <span className="ghost-text-dot">●</span>
          <span className="ghost-text-dot">●</span>
          <span className="ghost-text-dot">●</span>
        </span>
      ) : (
        <span className="ghost-text-suggestion">{text}</span>
      )}
      
      {/* Hint for accepting */}
      {isVisible && !isLoading && (
        <span className="ghost-text-hint">
          <kbd>Tab</kbd> to accept • <kbd>Esc</kbd> to dismiss
        </span>
      )}
    </span>
  );
});

/**
 * GhostTextOverlay - Floating overlay version for textarea-based editors
 * 
 * Positions ghost text at cursor location using absolute positioning.
 */
interface GhostTextOverlayProps {
  text: string;
  isVisible: boolean;
  isLoading?: boolean;
  /** Top offset in pixels */
  top?: number;
  /** Left offset in pixels */
  left?: number;
}

export const GhostTextOverlay = memo(function GhostTextOverlay({
  text,
  isVisible,
  isLoading = false,
  top = 0,
  left = 0,
}: GhostTextOverlayProps) {
  if (!isVisible && !isLoading) return null;

  return (
    <div
      className="ghost-text-overlay"
      style={{
        position: "absolute",
        top: `${top}px`,
        left: `${left}px`,
        pointerEvents: "none",
        zIndex: 10,
      }}
      aria-hidden="true"
      data-testid="ghost-text-overlay"
    >
      {isLoading ? (
        <span className="ghost-text-loading">
          <span className="ghost-text-dot">●</span>
          <span className="ghost-text-dot">●</span>
          <span className="ghost-text-dot">●</span>
        </span>
      ) : (
        <span className="ghost-text-suggestion">{text}</span>
      )}
    </div>
  );
});

export default GhostTextDisplay;
