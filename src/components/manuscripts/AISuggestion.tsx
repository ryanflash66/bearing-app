"use client";

import { useState } from "react";

export interface AISuggestionProps {
  suggestion: string;
  rationale?: string;
  confidence: number;
  originalText: string;
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * AI Suggestion component
 * Displays a suggestion with apply/dismiss controls
 * Never auto-applies changes (AC 2.3.2)
 */
export default function AISuggestion({
  suggestion,
  rationale,
  confidence,
  originalText,
  onApply,
  onDismiss,
}: AISuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLowConfidence = confidence < 0.5;

  return (
    <div className="my-4 rounded-lg border-2 border-blue-200 bg-blue-50 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-900">
              AI Suggestion
            </span>
            {isLowConfidence && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Beta
              </span>
            )}
            <span className="text-xs text-slate-600">
              {Math.round(confidence * 100)}% confidence
            </span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Dismiss suggestion"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Suggestion text */}
      <div className="mt-3">
        <div className="rounded-md bg-white p-3 text-sm text-slate-800">
          {suggestion}
        </div>
      </div>

      {/* Rationale (if available and expanded) */}
      {rationale && (
        <div className="mt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? "Hide" : "Show"} rationale
          </button>
          {isExpanded && (
            <div className="mt-1 rounded-md bg-slate-100 p-2 text-xs text-slate-600">
              {rationale}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onApply}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Apply
        </button>
        <button
          onClick={onDismiss}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Dismiss
        </button>
      </div>

      {/* Warning for low confidence */}
      {isLowConfidence && (
        <div className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          ⚠️ This suggestion has low confidence. Review carefully before applying.
        </div>
      )}
    </div>
  );
}

