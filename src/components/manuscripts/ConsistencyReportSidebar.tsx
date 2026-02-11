"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ConsistencyReport, ConsistencyIssue } from "@/lib/gemini";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useUndoStack } from "@/lib/hooks/useUndoStack";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FixedSizeList } from "react-window";
import DOMPurify from "dompurify";
import { Editor } from "@tiptap/react";
import { findExactCaseInsensitiveRange } from "@/lib/textNavigation";
import type { NavigationResult } from "@/lib/textNavigation";
import ErrorBanner from "@/components/ui/ErrorBanner";

// AC 8.7.9: XSS Protection - sanitize AI-generated content
const sanitize = (text: string): string => {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['em', 'strong', 'code', 'mark'],
    ALLOWED_ATTR: [],
  });
};

interface ConsistencyReportSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ConsistencyReport | null;
  isRunning: boolean;
  onNavigateToIssue: (issue: ExtendedConsistencyIssue) => Promise<NavigationResult>;
  onApplyFix: (issue: ExtendedConsistencyIssue) => Promise<void>;
  onSaveNow: () => Promise<boolean>;
  onCancel?: () => void;
  editor: Editor | null;
}

// Extended issue type to include documentPosition and unique ID
export interface ExtendedConsistencyIssue extends ConsistencyIssue {
  id: string;
  documentPosition: number;
  originalText?: string; // The exact text from the document for navigation
}

type IssueType = "grammar" | "style" | "tone" | "character" | "plot";
type Severity = "low" | "medium" | "high";

export default function ConsistencyReportSidebar({
  open,
  onOpenChange,
  report,
  isRunning,
  onNavigateToIssue,
  onApplyFix,
  onSaveNow,
  onCancel,
  editor,
}: ConsistencyReportSidebarProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // AC 8.7.8: Filter state persistence in URL
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(() => {
    const param = searchParams.get("severity");
    if (param) {
      const severities = param.split(",") as Severity[];
      return new Set(severities);
    }
    return new Set(["low", "medium", "high"] as Severity[]);
  });

  const [typeFilter, setTypeFilter] = useState<Set<IssueType> | null>(() => {
    const param = searchParams.get("type");
    if (param) {
      const types = param.split(",") as IssueType[];
      return new Set(types);
    }
    return null; // null means all types
  });

  // Keep filters in sync with back/forward navigation.
  useEffect(() => {
    const severityParam = searchParams.get("severity");
    const typeParam = searchParams.get("type");

    setSeverityFilter((prev) => {
      const next = severityParam
        ? new Set(severityParam.split(",") as Severity[])
        : new Set(["low", "medium", "high"] as Severity[]);

      const prevKey = Array.from(prev).sort().join(",");
      const nextKey = Array.from(next).sort().join(",");
      return prevKey === nextKey ? prev : next;
    });

    setTypeFilter((prev) => {
      const next = typeParam ? new Set(typeParam.split(",") as IssueType[]) : null;

      const prevKey = prev ? Array.from(prev).sort().join(",") : "__ALL__";
      const nextKey = next ? Array.from(next).sort().join(",") : "__ALL__";
      return prevKey === nextKey ? prev : next;
    });
  }, [searchParams]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Only add severity if not all selected
    if (severityFilter.size < 3) {
      params.set("severity", Array.from(severityFilter).join(","));
    } else {
      params.delete("severity");
    }

    // Only add type if filter is active
    if (typeFilter && typeFilter.size > 0) {
      params.set("type", Array.from(typeFilter).join(","));
    } else {
      params.delete("type");
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    const currentQuery = searchParams.toString();
    const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [severityFilter, typeFilter, router, pathname, searchParams]);

  // Undo stack for applied fixes
  const undoStack = useUndoStack();
  const [undoNow, setUndoNow] = useState(() => Date.now());

  // AC 8.7.4: Track applying state to prevent race conditions
  const [isApplying, setIsApplying] = useState(false);
  const [pendingSaveFailures, setPendingSaveFailures] = useState(0);
  const [showPersistentBanner, setShowPersistentBanner] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (undoStack.stack.length === 0) return;

    const nextExpiry = Math.min(...undoStack.stack.map((item) => item.appliedAt + 60000));
    const delay = nextExpiry - Date.now();

    if (delay <= 0) {
      setUndoNow(Date.now());
      return;
    }

    const id = setTimeout(() => setUndoNow(Date.now()), delay + 25);
    return () => clearTimeout(id);
  }, [undoStack.stack, undoNow]);

  // AC 8.7.5: Cancellation state
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const cancelClicked = useRef(false);
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track dismissed issues
  const [dismissedIssues, setDismissedIssues] = useState<Set<string>>(new Set());
  const [inlineWarnings, setInlineWarnings] = useState<Record<string, string | undefined>>({});

  // Convert report issues to extended issues with IDs and document positions
  const extendedIssues = useMemo((): ExtendedConsistencyIssue[] => {
    if (!report || !report.issues) return [];

    return report.issues.map((issue, index) => ({
      ...issue,
      id: `issue-${index}`,
      documentPosition: issue.documentPosition ?? issue.location.offset ?? 0,
      originalText: issue.location.quote,
    }));
  }, [report]);

  // AC 8.7.8: Sort by severity (high→medium→low), then by documentPosition
  const sortedIssues = useMemo(() => {
    const severityOrder = { high: 0, medium: 1, low: 2 };

    return [...extendedIssues]
      .filter((issue) => {
        const severityMatch = severityFilter.has(issue.severity);
        const typeMatch = typeFilter === null || typeFilter.has(issue.type as IssueType);
        const notDismissed = !dismissedIssues.has(issue.id);
        return severityMatch && typeMatch && notDismissed;
      })
      .sort((a, b) => {
        // First by severity
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;

        // Then by document position
        return a.documentPosition - b.documentPosition;
      });
  }, [extendedIssues, severityFilter, typeFilter, dismissedIssues]);

  // AC 8.7.7: Keyboard navigation
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FixedSizeList>(null);

  useEffect(() => {
    setActiveIndex((prev) => {
      if (sortedIssues.length === 0) return 0;
      return Math.min(prev, sortedIssues.length - 1);
    });
  }, [sortedIssues.length]);

  // AC 8.7.5: Show cancel button after 30 seconds
  useEffect(() => {
    if (isRunning && open) {
      cancelClicked.current = false;
      setElapsedTime(0);

      // Start elapsed time counter
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      // Show cancel button after 30 seconds
      cancelTimerRef.current = setTimeout(() => {
        setShowCancelButton(true);
      }, 30000);
    } else {
      setShowCancelButton(false);
      if (cancelTimerRef.current) {
        clearTimeout(cancelTimerRef.current);
        cancelTimerRef.current = null;
      }
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }

    return () => {
      if (cancelTimerRef.current) {
        clearTimeout(cancelTimerRef.current);
      }
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [isRunning, open]);

  // Reset cancel button when data arrives
  useEffect(() => {
    if (report && !isRunning) {
      setShowCancelButton(false);
    }
  }, [report, isRunning]);

  const handleCancel = useCallback(() => {
    cancelClicked.current = true;
    setShowCancelButton(false);
    onCancel?.();
    setNotice("Check cancelled.");
  }, [onCancel]);

  const toggleSeverity = useCallback((severity: Severity) => {
    setSeverityFilter((prev) => {
      const newFilter = new Set(prev);
      if (newFilter.has(severity)) {
        // Don't allow deselecting all
        if (newFilter.size > 1) {
          newFilter.delete(severity);
        }
      } else {
        newFilter.add(severity);
      }
      return newFilter;
    });
  }, []);

  const toggleType = useCallback((type: IssueType) => {
    setTypeFilter((prev) => {
      if (prev === null) {
        // If all types were selected, now select only this one
        return new Set([type]);
      }

      const newFilter = new Set(prev);
      if (newFilter.has(type)) {
        newFilter.delete(type);
        // If all deselected, return to "all"
        if (newFilter.size === 0) {
          return null;
        }
      } else {
        newFilter.add(type);
      }
      return newFilter;
    });
  }, []);

  const handleApplyFix = useCallback(async (issue: ExtendedConsistencyIssue) => {
    if (isApplying || !issue.suggestion) return;

    setIsApplying(true);
    setSaveError(null);

    try {
      // Apply the fix
      await onApplyFix(issue);

      // Add to undo stack
      undoStack.push({
        issueId: issue.id,
        originalText: issue.originalText || issue.location.quote,
        fixedText: issue.suggestion,
        appliedAt: Date.now(),
      });

      // Trigger autosave and wait for completion/failure (AC 8.7.4)
      const saved = await onSaveNow();
      if (!saved) {
        throw new Error("Save failed");
      }

      // Reset failure count on success
      setPendingSaveFailures(0);
      setShowPersistentBanner(false);
      setNotice("Saved.");

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      // AC 8.7.4: If we couldn't apply the fix, don't treat it as a save failure.
      if (message.includes("Cannot apply fix")) {
        setInlineWarnings((prev) => ({ ...prev, [issue.id]: message }));
        return;
      }

      // AC 8.7.4: Autosave failure handling
      console.error("Save failed:", error);

      setPendingSaveFailures((prev) => {
        const newCount = prev + 1;

        // Show persistent banner after 3 consecutive failures
        if (newCount >= 3) {
          setShowPersistentBanner(true);
        }

        return newCount;
      });

      // Show error immediately on first failure (AC 8.7.4)
      setSaveError("Save failed. Your fix was applied locally but not saved. Retry?");
    } finally {
      setIsApplying(false);
    }
  }, [isApplying, onApplyFix, onSaveNow, undoStack]);

  const handleUndo = useCallback(async (issueId: string) => {
    const item = undoStack.getItem(issueId);
    if (!item || !editor) return;

    setSaveError(null);

    const range = findExactCaseInsensitiveRange(editor, item.fixedText);
    if (!range) {
      setInlineWarnings((prev) => ({ ...prev, [issueId]: "Cannot undo—text has changed." }));
      return;
    }

    editor.commands.insertContentAt(range, item.originalText);

    const saved = await onSaveNow();
    if (!saved) {
      setSaveError("Save failed. Your undo was applied locally but not saved. Retry?");
      setPendingSaveFailures((prev) => {
        const next = prev + 1;
        if (next >= 3) setShowPersistentBanner(true);
        return next;
      });
    } else {
      setPendingSaveFailures(0);
      setShowPersistentBanner(false);
      setNotice("Saved.");
    }

    undoStack.pop(issueId);
  }, [editor, onSaveNow, undoStack]);

  const handleDismiss = useCallback((issueId: string) => {
    setDismissedIssues((prev) => new Set(prev).add(issueId));
    undoStack.pop(issueId);
  }, [undoStack]);

  // AC 8.7.7: Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (sortedIssues.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = Math.min(prev + 1, sortedIssues.length - 1);
        listRef.current?.scrollToItem(next, 'smart');
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = Math.max(prev - 1, 0);
        listRef.current?.scrollToItem(next, 'smart');
        return next;
      });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const issue = sortedIssues[activeIndex];
      if (issue) {
        onNavigateToIssue(issue).then((res) => {
          if (!res.found && res.warning) {
            setInlineWarnings((prev) => ({ ...prev, [issue.id]: res.warning }));
          } else {
            setInlineWarnings((prev) => ({ ...prev, [issue.id]: undefined }));
          }
        });
      }
    }
  }, [sortedIssues, activeIndex, onNavigateToIssue]);

  const getSeverityStyle = useCallback((severity: Severity) => {
    switch (severity) {
      case "high":
        return "border-l-4 border-red-600 bg-red-50";
      case "medium":
        return "border-l-4 border-amber-600 bg-amber-50";
      case "low":
        return "border-l-4 border-slate-500 bg-slate-50";
    }
  }, []);

  const getSeverityIcon = useCallback((severity: Severity) => {
    if (severity === "high") return "⚠️";
    return "";
  }, []);

  const IssueCardRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const issue = sortedIssues[index];
      if (!issue) return null;

      const isFocused = index === activeIndex;
      const undoItem = undoStack.getItem(issue.id);
      const showUndo = !!undoItem && undoNow - undoItem.appliedAt < 60000;

      return (
        <div style={style} className="px-4 py-2">
          <div
            className={`p-3 rounded-lg transition-all ${getSeverityStyle(issue.severity)} ${
              isFocused ? "ring-2 ring-primary" : ""
            }`}
            tabIndex={0}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getSeverityIcon(issue.severity)}
                <span className="text-xs font-semibold uppercase text-slate-600">
                  {issue.severity} - {issue.type}
                </span>
              </div>
              <button
                onClick={() => handleDismiss(issue.id)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Dismiss issue"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {inlineWarnings[issue.id] && (
              <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {inlineWarnings[issue.id]}
              </div>
            )}

            <p
              className="text-sm text-slate-800 mb-2"
              dangerouslySetInnerHTML={{ __html: sanitize(issue.explanation) }}
            />

            {issue.originalText && (
              <div className="mb-2 p-2 bg-slate-100 rounded text-xs italic text-slate-600 border-l-2 border-slate-300">
                "{issue.originalText.slice(0, 100)}{issue.originalText.length > 100 ? "..." : ""}"
              </div>
            )}

            {issue.suggestion && (
              <div className="mb-2 p-2 bg-emerald-50 rounded text-xs text-emerald-800 border-l-2 border-emerald-400">
                <strong>Suggestion:</strong>{" "}
                <span dangerouslySetInnerHTML={{ __html: sanitize(issue.suggestion) }} />
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  onNavigateToIssue(issue).then((res) => {
                    if (!res.found && res.warning) {
                      setInlineWarnings((prev) => ({ ...prev, [issue.id]: res.warning }));
                    } else {
                      setInlineWarnings((prev) => ({ ...prev, [issue.id]: undefined }));
                    }
                  });
                }}
                className="px-3 py-1 text-xs font-medium rounded bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300 transition-colors min-h-12"
              >
                Locate
              </button>

              {issue.suggestion && (
                <button
                  onClick={() => handleApplyFix(issue)}
                  disabled={isApplying}
                  className="px-3 py-1 text-xs font-medium rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-12"
                >
                  {isApplying ? "Applying..." : "Apply Fix"}
                </button>
              )}

              {showUndo && (
                <button
                  onClick={() => handleUndo(issue.id)}
                  className="px-3 py-1 text-xs font-medium rounded bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300 transition-colors min-h-12"
                >
                  Undo
                </button>
              )}
            </div>
          </div>
        </div>
      );
    },
    [
      activeIndex,
      getSeverityIcon,
      getSeverityStyle,
      handleApplyFix,
      handleDismiss,
      handleUndo,
      inlineWarnings,
      isApplying,
      onNavigateToIssue,
      sortedIssues,
      undoNow,
      undoStack,
    ],
  );

  // Calculate visible range for count badge
  const startIndex = 0;
  const endIndex = Math.min(20, sortedIssues.length);
  const totalIssues = sortedIssues.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="w-full sm:max-w-md overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        aria-modal="true"
        role="dialog"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-lg font-semibold">Consistency Check</SheetTitle>
        </SheetHeader>

        {notice && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            {notice}
          </div>
        )}

        {saveError && (
          <div className="mt-4">
            <ErrorBanner
              message={saveError}
              onRetry={async () => {
                setSaveError(null);
                const saved = await onSaveNow();
                if (!saved) {
                  setSaveError("Save failed. Your changes are preserved locally. Retry?");
                  setPendingSaveFailures((prev) => {
                    const next = prev + 1;
                    if (next >= 3) setShowPersistentBanner(true);
                    return next;
                  });
                } else {
                  setPendingSaveFailures(0);
                  setShowPersistentBanner(false);
                  setNotice("Saved.");
                }
              }}
              dismissible={false}
            />
          </div>
        )}

        {/* AC 8.7.4: Persistent banner for repeated save failures */}
        {showPersistentBanner && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-800">
            <strong>Connection issues.</strong> Your work is saved locally.
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <label className="text-xs font-semibold uppercase text-slate-500">Severity:</label>
            {(['high', 'medium', 'low'] as Severity[]).map((severity) => (
              <button
                key={severity}
                onClick={() => toggleSeverity(severity)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  severityFilter.has(severity)
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-slate-100 border-slate-300 text-slate-600'
                }`}
              >
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="text-xs font-semibold uppercase text-slate-500">Type:</label>
            {(['grammar', 'style', 'tone', 'character', 'plot'] as IssueType[]).map((type) => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  typeFilter === null || typeFilter.has(type)
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-slate-100 border-slate-300 text-slate-600'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-4 flex-1 overflow-hidden">
          {/* AC 8.7.5: Skeleton loader while running */}
          {isRunning && (!report || report.issues.length === 0) && (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              {showCancelButton && (
                <div className="text-center mt-4">
                  <p className="text-sm text-slate-600 mb-2">
                    Taking longer than expected... ({elapsedTime}s)
                  </p>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium rounded bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {!isRunning && report && (
            <div>
              {sortedIssues.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No issues found matching your filters.</p>
                </div>
              ) : (
                <div>
                  <div className="mb-2 text-sm text-slate-600">
                    Showing {startIndex + 1}-{endIndex} of {totalIssues} issues
                  </div>

                  {/* AC 8.7.7: Virtualized list with keyboard navigation */}
                  <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none">
                    <FixedSizeList
                      ref={listRef}
                      height={400}
                      itemCount={sortedIssues.length}
                      itemSize={160}
                      width="100%"
                      outerRef={(el) => {
                        if (el) {
                          el.setAttribute('tabindex', '0');
                        }
                      }}
                    >
                      {IssueCardRow}
                    </FixedSizeList>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isRunning && !report && (
            <div className="py-10 text-center text-slate-500">
              <p className="text-sm">Run a check to see consistency issues.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
