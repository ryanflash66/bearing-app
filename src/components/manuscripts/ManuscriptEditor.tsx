"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAutosave, AutosaveState } from "@/lib/useAutosave";
import { createClient } from "@/utils/supabase/client";
import { updateManuscript, getManuscript } from "@/lib/manuscripts";
import ConflictResolutionModal from "./ConflictResolutionModal";
import VersionHistory from "./VersionHistory";
import AISuggestion from "./AISuggestion";
import ConsistencyReportViewer from "./ConsistencyReportViewer";
import ConsistencyReportSidebar, { ExtendedConsistencyIssue } from "./ConsistencyReportSidebar";
import { navigateToText, replaceExactCaseInsensitiveText } from "@/lib/textNavigation";
import Binder from "./Binder";
import { ConsistencyIssue, ConsistencyReport } from "@/lib/gemini";
import { useGhostText } from "@/lib/useGhostText";
import { useDictation } from "@/lib/useDictation";
import { GhostTextOverlay } from "./GhostTextDisplay";
import TiptapEditor from "../editor/TiptapEditor";
import { Editor } from "@tiptap/react";
import CommandPalette from "../editor/CommandPalette";
import { useCommandPalette } from "@/lib/useCommandPalette";
import {
  extractCharacters,
  saveSelection,
  restoreSelection,
  findFirstOccurrence,
} from "@/lib/manuscript-utils";
import BetaShareModal from "./BetaShareModal";
import BetaCommentsPanel from "./BetaCommentsPanel";
import ExportModal from "./ExportModal";
import FullscreenControls from "./FullscreenControls";

import ServiceRequestModal, {
  PublishingRequestMetadata,
} from "@/components/marketplace/ServiceRequestModal";
import ServiceStatusBanner from "./ServiceStatusBanner";
import type { ServiceRequest } from "@/lib/service-requests";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const EDITOR_CONTENT_WRAPPER_CLASSNAME =
  "mx-auto px-4 py-6 md:px-8 md:py-12 max-w-3xl";

interface ManuscriptEditorProps {
  manuscriptId: string;
  initialTitle: string;
  initialContent: string;
  initialUpdatedAt: string;
  initialMetadata?: Record<string, any>;
  onTitleChange?: (title: string) => void;
  activeServiceRequest?: ServiceRequest | null;
}

interface BetaComment {
  id: string;
  author_name: string;
  comment_text: string;
  selected_text: string;
  type: string;
  status: string;
}

// Status indicator component with manual save button (AC: 8.2.2, 8.2.3, 8.2.6)
function AutosaveIndicator({
  state,
  onSaveNow,
  isSaving = false,
  disabled = false,
}: {
  state: AutosaveState;
  onSaveNow?: () => Promise<boolean>;
  isSaving?: boolean;
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
        // Distinguish between retrying (automatic) and failed (manual action needed) - AC: 8.2.6
        if (state.maxRetriesExceeded) {
          // Max retries exceeded - show Save Now button (AC: 8.2.2)
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
          // Actively waiting to retry - show countdown (AC: 8.2.1, 8.2.6)
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
          // Generic error with retry pending
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
            Offline - changes saved locally
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
            Conflict detected - please refresh
          </span>
        );
      default:
        return state.pendingChanges ? (
          <span className="text-slate-600">Unsaved changes</span>
        ) : (
          <span className="text-slate-500">Ready</span>
        );
    }
  };

  return <div className="text-sm">{getStatusDisplay()}</div>;
}

export default function ManuscriptEditor({
  manuscriptId,
  initialTitle,
  initialContent,
  initialUpdatedAt,
  initialMetadata,
  onTitleChange,
  activeServiceRequest,
}: ManuscriptEditorProps) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [metadata, setMetadata] = useState(initialMetadata || {});
  const [wordCount, setWordCount] = useState(0);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showBetaShare, setShowBetaShare] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [showPublishingRequestModal, setShowPublishingRequestModal] =
    useState(false);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [selectedChapterForReport, setSelectedChapterForReport] = useState<
    number | null
  >(null);
  const [localContent, setLocalContent] = useState(initialContent);
  const [serverState, setServerState] = useState<{
    content_text: string;
    title: string;
  } | null>(null);

  // AC 8.20.3: Determine if editing is locked due to active service request
  const isLocked =
    activeServiceRequest !== null && activeServiceRequest !== undefined;

  // AI Suggestion state
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<{
    suggestion: string;
    rationale?: string;
    confidence: number;
    originalText: string;
  } | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // Consistency check state
  const [consistencyCheckStatus, setConsistencyCheckStatus] = useState<{
    status: "idle" | "queued" | "running" | "completed" | "failed";
    jobId?: string;
    error?: string;
    report?: ConsistencyReport;
  }>({ status: "idle" });
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);

  // AC 8.7.1: New sidebar state (feature flag controlled)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const useNewSidebar = process.env.NEXT_PUBLIC_CONSISTENCY_SIDEBAR === 'true';

  // AC 8.7.5: Cancellation with AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollAbortControllerRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePollJobIdRef = useRef<string | null>(null);

  const [betaComments, setBetaComments] = useState<BetaComment[]>([]);
  const [betaCommentsLoading, setBetaCommentsLoading] = useState(false);
  const [betaCommentsError, setBetaCommentsError] = useState<string | null>(
    null,
  );

  // Mobile Binder state
  const [isMobileBinderOpen, setIsMobileBinderOpen] = useState(false);

  // Clean up orphaned Zen mode localStorage on mount (Story 8.3)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bearing-zen-mode");
    }
  }, []);

  // Extract chapters from content for navigation (same logic as Binder)
  const chapters = useMemo(() => {
    if (!content) return [];
    const regex = /^\s*(#{1,2})\s+(.+)$/gm;
    const matches: { title: string; index: number }[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        title: match[2],
        index: match.index,
      });
    }
    return matches;
  }, [content]);

  // Extract character names from content (capitalized words that appear multiple times)
  // Extract character names from content
  const characters = useMemo(() => extractCharacters(content), [content]);

  // Store cursor position for restoration after command palette closes
  const savedCursorPosition = useRef<number | null>(null);

  // Store queueSave ref to avoid circular dependency in callbacks that are defined before autosave hook
  const queueSaveRef = useRef<
    | ((
        contentJson: any,
        contentText: string,
        title: string,
        metadata: any,
      ) => void)
    | null
  >(null);

  // Handle command palette close - restore focus to editor
  const handleCommandPaletteClose = useCallback(() => {
    restoreSelection(editor, savedCursorPosition);
  }, [editor]);

  // Handle AI transformation from Command Palette
  const handleCommandTransform = useCallback(
    async (instruction: string, text: string) => {
      if (!text.trim()) return;

      setIsLoadingSuggestion(true);
      setSuggestionError(null);

      try {
        const response = await fetch(
          `/api/manuscripts/${manuscriptId}/suggest`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              selectionText: text,
              instruction,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to transform text" }));
          throw new Error(errorData.error || "Failed to transform text");
        }

        // Handle SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("Response body is not readable");

        let streamingSuggestion = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (!data.trim()) continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "chunk") {
                  streamingSuggestion += parsed.text;
                  setSuggestion({
                    suggestion: streamingSuggestion,
                    confidence: 0.75,
                    originalText: text,
                  });
                } else if (parsed.type === "complete") {
                  setSuggestion({
                    suggestion: parsed.suggestion || streamingSuggestion,
                    rationale: parsed.rationale,
                    confidence: parsed.confidence,
                    originalText: text,
                  });
                }
              } catch (e) {
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }
      } catch (error) {
        console.error("Transform error:", error);
        setSuggestionError(
          error instanceof Error ? error.message : "Failed to transform text",
        );
      } finally {
        setIsLoadingSuggestion(false);
      }
    },
    [manuscriptId],
  );

  // Command Palette
  const commandPalette = useCommandPalette({
    enabled: true,
    onTransform: async (instruction, text) => {
      // Save cursor position before transformation
      saveSelection(editor, savedCursorPosition);
      await handleCommandTransform(instruction, text);
    },
    onNavigate: (target) => {
      if (editor) {
        let pos: number | null = null;

        if (typeof target === "string") {
          // Search for first occurrence of the text (name or chapter title)
          pos = findFirstOccurrence(editor, target);
        } else {
          // Fallback for number (though discouraged due to drift)
          pos = target;
        }

        if (pos !== null) {
          editor.commands.setTextSelection(pos);
          editor.view.focus();

          // Try to scroll into view (robustly)
          try {
            const { node } = editor.view.domAtPos(pos);
            if (node instanceof Element) {
              node.scrollIntoView({ behavior: "smooth", block: "start" });
            } else if (node.parentElement) {
              node.parentElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          } catch (e) {
            // Ignore scroll errors if DOM pos not ready
          }
        }
      }
    },
    onClose: handleCommandPaletteClose,
    selectedText,
    chapters,
  });

  // Track cursor position for ghost text
  const [cursorPosition, setCursorPosition] = useState(0);

  // Ghost text request handler
  const handleGhostTextRequest = useCallback(
    async (ctx: string, pos: number): Promise<string | null> => {
      // Get context around cursor (last 500 chars before cursor)
      const contextStart = Math.max(0, pos - 500);
      const contextBefore = ctx.substring(contextStart, pos);

      if (contextBefore.trim().length < 20) return null;

      try {
        const response = await fetch(
          `/api/manuscripts/${manuscriptId}/suggest`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              selectionText: contextBefore.slice(-100), // Last 100 chars as context
              instruction: "Continue this text naturally with 1-2 sentences.",
              mode: "ghost",
            }),
          },
        );

        if (!response.ok) return null;

        // For ghost text, we want the full response, not streamed
        const reader = response.body?.getReader();
        if (!reader) return null;

        let fullText = "";
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "chunk") {
                  fullText += data.text;
                } else if (data.type === "complete" && data.suggestion) {
                  return data.suggestion.trim().substring(0, 150); // Limit ghost text length
                }
              } catch {
                /* skip invalid JSON */
              }
            }
          }
        }

        return fullText.trim().substring(0, 150) || null;
      } catch {
        return null;
      }
    },
    [manuscriptId],
  );

  // Handle ghost text acceptance - uses ref to access queueSave to avoid circular dependency
  const handleGhostTextAccept = useCallback(
    (suggestion: string) => {
      // AC 8.20.3: Block ghost text acceptance when editing is locked
      if (!editor || isLocked) return;

      // Use editor commands to insert text so Tiptap state is updated correctly
      editor.commands.insertContent(suggestion);

      const newContent = editor.getText();
      const newJson = editor.getJSON();

      // Update content state
      setContent(newContent);
      setLocalContent(newContent);

      // Trigger autosave immediately for accepted ghost text using ref
      if (queueSaveRef.current) {
        queueSaveRef.current(newJson, newContent, title, metadata);
      }

      // Move cursor to end of inserted text is handled by insertContent
      setCursorPosition(editor.state.selection.to);
    },
    [editor, title, metadata, isLocked],
  );

  // Initialize Ghost Text
  const ghostText = useGhostText(content, cursorPosition, {
    pauseMs: 3000, // 3 seconds per AC 2.3.6
    onRequestSuggestion: handleGhostTextRequest,
    onAccept: handleGhostTextAccept,
    enabled: !selectedText && !suggestion && !isLoadingSuggestion,
  });

  const [interimDictationText, setInterimDictationText] = useState("");

  // Fullscreen state (Story 8.9)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const scrollPositionRef = useRef<number>(0);

  // Load/Save dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem("bearing-fullscreen-theme");
    if (saved === "dark") setIsDarkMode(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("bearing-fullscreen-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const editorArea = document.querySelector(
      '[data-testid="editor-main-area"], [data-testid="fullscreen-overlay"]',
    );

    setIsFullscreen((prev) => {
      if (!prev) {
        // Entering fullscreen - save scroll position
        scrollPositionRef.current = editorArea?.scrollTop || 0;
      }
      return !prev;
    });

    // Force focus back to editor and restore scroll position after layout shift
    setTimeout(() => {
      editor?.commands.focus();
      const newEditorArea = document.querySelector(
        '[data-testid="editor-main-area"], [data-testid="fullscreen-overlay"]',
      );
      if (newEditorArea && scrollPositionRef.current > 0) {
        newEditorArea.scrollTop = scrollPositionRef.current;
      }
    }, 0);
  }, [editor]);

  // Handle dictation result
  const handleDictationResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (!editor) return;

      if (isFinal) {
        editor.commands.insertContent(text + " ");
        setInterimDictationText("");
      } else {
        setInterimDictationText(text);
      }
    },
    [editor],
  );

  const {
    isListening,
    isSupported: isDictationSupported,
    toggle: toggleDictation,
    error: dictationError,
  } = useDictation({
    onResult: handleDictationResult,
  });

  // Initialize autosave hook
  const { state, queueSave, saveNow, resetTimestamp } = useAutosave(
    manuscriptId,
    initialUpdatedAt,
    {
      debounceMs: 5000, // 5 seconds per AC 2.1.1
      initialTitle,
      versionThreshold: 3, // Create version every 3 saves for more frequent history during active writing
      onSaveSuccess: () => {
        console.log("Autosave successful");
      },
      onSaveError: (error) => {
        console.error("Autosave failed:", error);
      },
      onConflict: (state) => {
        setServerState(state);
        setShowConflictModal(true);
      },
    },
  );

  // Handle keyboard shortcuts (Save and Fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Cmd+S / Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        // AC 8.20.3: Block manual save when editing is locked
        if (!isLocked) {
          saveNow();
        }
      }

      // Fullscreen: Cmd+\ / Ctrl+\ (Story 8.9)
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        toggleFullscreen();
      }

      // Exit Fullscreen: Escape (Story 8.9)
      if (isFullscreen && e.key === "Escape") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveNow, isLocked, toggleFullscreen, isFullscreen]);

  // Update queueSave ref whenever queueSave changes
  useEffect(() => {
    queueSaveRef.current = queueSave;
  }, [queueSave]);

  // Handle conflict resolution
  const handleConflictResolve = useCallback(
    async (action: "overwrite" | "reload" | "merge") => {
      const supabase = createClient();

      if (action === "overwrite") {
        // Force save local content (bypass optimistic locking)
        const result = await updateManuscript(
          supabase,
          manuscriptId,
          {
            content_text: localContent,
            content_json: {
              type: "doc",
              content: [{ type: "text", text: localContent }],
            },
          },
          // No expectedUpdatedAt - force overwrite
        );

        if (result.error || !result.manuscript) {
          console.error("Failed to overwrite:", result.error);
          alert("Failed to save changes. Please try again.");
          return;
        }

        // Update timestamp to avoid immediate conflict on next save
        resetTimestamp(result.manuscript.updated_at);

        // Reload page to get fresh state
        router.refresh();
      } else if (action === "reload") {
        // Reload from server
        const { manuscript, error } = await getManuscript(
          supabase,
          manuscriptId,
        );
        if (error || !manuscript) {
          console.error("Failed to reload:", error);
          alert("Failed to reload manuscript. Please refresh the page.");
          return;
        }

        // Update local state with server content
        setContent(manuscript.content_text);
        setLocalContent(manuscript.content_text);
        setTitle(manuscript.title);
        resetTimestamp(manuscript.updated_at);
        router.refresh();
      } else if (action === "merge" && serverState) {
        // Intelligent Merge: Try to combine local and server content
        // 1. Identify common parts vs new parts
        // Simple strategy for now: If one is a subset of the other, take the superset.
        // Otherwise, append the server's new content if local seems to have diverged.
        let mergedContent = localContent;

        if (serverState.content_text.includes(localContent)) {
          // Server version has everything we have plus more
          mergedContent = serverState.content_text;
        } else if (localContent.includes(serverState.content_text)) {
          // Local version has everything server has plus more. We are already the superset.
          mergedContent = localContent;
        } else {
          // Real divergence: append server version with a marker
          mergedContent = `${localContent}\n\n--- MERGED FROM SERVER ---\n\n${serverState.content_text}`;
        }

        // Save the merged version
        const result = await updateManuscript(supabase, manuscriptId, {
          content_text: mergedContent,
          content_json: {
            type: "doc",
            content: [{ type: "text", text: mergedContent }],
          },
        });

        if (result.error || !result.manuscript) {
          console.error("Failed to save merged version:", result.error);
          alert("Failed to merge. Please try overwriting or reloading.");
          return;
        }

        setContent(mergedContent);
        setLocalContent(mergedContent);
        resetTimestamp(result.manuscript.updated_at);
        router.refresh();
      }

      // Clear backup and cache once resolved
      localStorage.removeItem(`bearing_pending_${manuscriptId}`);
      setShowConflictModal(false);
      setServerState(null);
    },
    [manuscriptId, localContent, serverState, router, resetTimestamp],
  );

  // Calculate word count
  useEffect(() => {
    const words = localContent.trim()
      ? localContent.trim().split(/\s+/).length
      : 0;
    setWordCount(words);
  }, [localContent]);

  const fetchBetaComments = useCallback(async () => {
    setBetaCommentsLoading(true);
    setBetaCommentsError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("beta_comments")
        .select("id, author_name, comment_text, selected_text, type, status")
        .eq("manuscript_id", manuscriptId);

      if (error) {
        throw error;
      }

      setBetaComments(data || []);
    } catch (err) {
      setBetaCommentsError(
        err instanceof Error ? err.message : "Failed to load beta comments",
      );
    } finally {
      setBetaCommentsLoading(false);
    }
  }, [manuscriptId]);

  useEffect(() => {
    fetchBetaComments();
  }, [fetchBetaComments]);

  const handleResolveBetaComment = useCallback(
    async (commentId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("beta_comments")
        .update({ status: "resolved" })
        .eq("id", commentId);

      if (error) {
        setBetaCommentsError(error.message || "Failed to resolve comment");
        return;
      }

      fetchBetaComments();
    },
    [fetchBetaComments],
  );

  // Handle metadata update with autosave
  const handleMetadataUpdate = useCallback(
    (newMetadata: any) => {
      // AC 8.20.3: Prevent saves while locked
      if (isLocked) return;

      setMetadata(newMetadata);
      const currentJson = editor
        ? editor.getJSON()
        : { type: "doc", content: [{ type: "text", text: content }] };
      queueSave(currentJson, content, title, newMetadata);
    },
    [queueSave, content, title, editor, isLocked],
  );

  // AC 8.6.5: Explicit metadata save for publishing request (not debounced)
  // Persists acknowledgements, education_level, bisac_codes, keywords immediately
  const handlePublishingMetadataSave = useCallback(
    async (partialMetadata: PublishingRequestMetadata) => {
      const mergedMetadata = { ...metadata, ...partialMetadata };
      setMetadata(mergedMetadata);

      // Update manuscript metadata directly via API
      const supabase = createClient();
      const { error } = await supabase
        .from("manuscripts")
        .update({ metadata: mergedMetadata })
        .eq("id", manuscriptId);

      if (error) {
        console.error("Failed to save publishing metadata:", error);
        throw new Error("Failed to save manuscript metadata");
      }
    },
    [metadata, manuscriptId],
  );

  // Handle content change with autosave
  const handleContentChange = useCallback(
    (newContent: string) => {
      // AC 8.20.3: Prevent saves while locked
      if (isLocked) return;

      setContent(newContent);
      setLocalContent(newContent); // Track local content for conflict resolution
      const currentJson = editor
        ? editor.getJSON()
        : { type: "doc", content: [{ type: "text", text: newContent }] };
      queueSave(currentJson, newContent, title, metadata);
    },
    [queueSave, title, metadata, editor, isLocked],
  );

  // Handle title change with autosave
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      // AC 8.20.3: Prevent saves while locked
      if (isLocked) return;

      setTitle(newTitle);
      onTitleChange?.(newTitle);
      // Also trigger autosave for title changes
      const currentJson = editor
        ? editor.getJSON()
        : { type: "doc", content: [{ type: "text", text: content }] };
      queueSave(currentJson, content, newTitle, metadata);
    },
    [onTitleChange, queueSave, content, metadata, editor, isLocked],
  );

  // Track text selection and cursor position

  // Request AI suggestion with streaming support
  const handleRequestSuggestion = useCallback(async () => {
    if (!selectedText.trim()) {
      setSuggestionError("Please select some text first");
      return;
    }

    setIsLoadingSuggestion(true);
    setSuggestionError(null);
    setSuggestion(null);

    const startTime = Date.now();
    let streamingSuggestion = "";
    let firstChunkTime: number | null = null;

    try {
      const response = await fetch(`/api/manuscripts/${manuscriptId}/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectionText: selectedText,
          instruction: undefined, // Can be extended later
        }),
      });

      if (!response.ok) {
        // Try to parse error as JSON, fallback to text
        let errorMessage = "Failed to get suggestion";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = (await response.text()) || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      let buffer = "";
      let finalData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (!data.trim()) continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "chunk") {
                // Stream chunk received
                streamingSuggestion += parsed.text;
                if (firstChunkTime === null) {
                  firstChunkTime = Date.now();
                  // AC 2.3.1: First chunk should arrive within 500ms for good UX
                  const timeToFirstChunk = firstChunkTime - startTime;
                  if (timeToFirstChunk > 500) {
                    console.warn(
                      `First chunk took ${timeToFirstChunk}ms (target: <500ms)`,
                    );
                  }
                }

                // Update UI with streaming text
                setSuggestion({
                  suggestion: streamingSuggestion,
                  rationale: undefined,
                  confidence: 0.75, // Will be updated with final value
                  originalText: selectedText,
                });
              } else if (parsed.type === "complete") {
                // Final result received
                finalData = parsed;
                const elapsed = Date.now() - startTime;

                // AC 2.3.1: Check if response completed within 2 seconds (P95)
                if (elapsed > 2000) {
                  console.warn(
                    `Suggestion took ${elapsed}ms (target: <2000ms)`,
                  );
                }

                setSuggestion({
                  suggestion: parsed.suggestion || streamingSuggestion,
                  rationale: parsed.rationale,
                  confidence: parsed.confidence,
                  originalText: selectedText,
                });
              } else if (parsed.type === "error") {
                throw new Error(parsed.error || "Error from server");
              }
            } catch (e) {
              // Skip invalid JSON
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      // Ensure final data is set
      if (finalData) {
        setSuggestion({
          suggestion: finalData.suggestion || streamingSuggestion,
          rationale: finalData.rationale,
          confidence: finalData.confidence,
          originalText: selectedText,
        });
      }
    } catch (error) {
      console.error("Error getting suggestion:", error);
      setSuggestionError(
        error instanceof Error ? error.message : "Failed to get suggestion",
      );
    } finally {
      setIsLoadingSuggestion(false);
    }
  }, [selectedText, manuscriptId]);

  // Apply suggestion
  const handleApplySuggestion = useCallback(() => {
    if (!suggestion || selectionStart === null || selectionEnd === null) return;

    const before = content.substring(0, selectionStart);
    const after = content.substring(selectionEnd);
    const newContent = before + suggestion.suggestion + after;

    handleContentChange(newContent);
    setSuggestion(null);
    setSelectedText("");

    // Clear selection
    // Clear selection
    if (editor) {
      editor.commands.setTextSelection({
        from: selectionStart,
        to: selectionStart + suggestion.suggestion.length,
      });
      editor.view.focus();
    }
  }, [suggestion, selectionStart, selectionEnd, content, handleContentChange]);

  // Dismiss suggestion
  const handleDismissSuggestion = useCallback(() => {
    setSuggestion(null);
    setSuggestionError(null);
  }, []);

  // AC 8.7.5: Handle cancellation
  const handleCancelCheck = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (pollAbortControllerRef.current) {
      pollAbortControllerRef.current.abort();
      pollAbortControllerRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    activePollJobIdRef.current = null;
    setIsCheckingConsistency(false);
    setConsistencyCheckStatus({ status: "idle" });
    // Keep sidebar open in idle state so the user can immediately start another check.
  }, []);

  // AC 8.7.3: Navigate to issue in editor with fuzzy matching fallback
  const handleNavigateToIssue = useCallback(
    async (issue: ExtendedConsistencyIssue) => {
      if (!editor || !issue.originalText) {
        return { found: false, warning: "Text may have changed. Navigate manually." };
      }

      return navigateToText(editor, issue.originalText);
    },
    [editor],
  );

  // AC 8.7.4: Apply fix to editor
  const handleApplyFix = useCallback(
    async (issue: ExtendedConsistencyIssue) => {
      if (!editor || !issue.suggestion || !issue.originalText) return;

      const replaced = replaceExactCaseInsensitiveText(
        editor,
        issue.originalText,
        issue.suggestion,
      );

      if (!replaced.replaced) {
        throw new Error("Cannot apply fix—text has changed.");
      }
    },
    [editor],
  );

  const saveConsistencyEditNow = useCallback(async () => {
    if (!editor) return false;

    const currentJson = editor.getJSON();
    const currentText = editor.getText();

    // AC 8.7.4: Applying a fix must trigger queueSave() from useAutosave.
    queueSave(currentJson, currentText, title, metadata);

    return saveNow();
  }, [editor, metadata, queueSave, saveNow, title]);

  // Handle consistency check trigger
  const handleCheckConsistency = useCallback(async () => {
    // AC 8.7.5: Cancel any existing check before starting new one
    handleCancelCheck();

    // Create new AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsCheckingConsistency(true);
    setConsistencyCheckStatus({ status: "queued" });

    // Open sidebar when starting check
    if (useNewSidebar) {
      setSidebarOpen(true);
    }

    try {
      const response = await fetch(
        `/api/manuscripts/${manuscriptId}/consistency-check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal, // AC 8.7.5: Pass abort signal
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to start consistency check" }));
        throw new Error(errorData.error || "Failed to start consistency check");
      }

      const data = await response.json();
      setConsistencyCheckStatus({
        status: data.cached ? "completed" : data.status,
        jobId: data.jobId,
      });

      // If cached, fetch the report
      if (data.cached && data.jobId) {
        pollConsistencyCheckStatus(data.jobId);
      } else if (data.jobId) {
        // Start polling for status updates
        pollConsistencyCheckStatus(data.jobId);
      }
    } catch (error) {
      // AC 8.7.5: Don't show error if request was aborted by user
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Consistency check cancelled by user');
        return;
      }

      console.error("Error starting consistency check:", error);
      setConsistencyCheckStatus({
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Failed to start consistency check",
      });
    } finally {
      setIsCheckingConsistency(false);
      abortControllerRef.current = null;
    }
  }, [handleCancelCheck, manuscriptId, useNewSidebar]);

  // Poll consistency check status
  const pollConsistencyCheckStatus = useCallback(
    async (jobId: string) => {
      // Stop any previous poll
      if (pollAbortControllerRef.current) {
        pollAbortControllerRef.current.abort();
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }

      activePollJobIdRef.current = jobId;
      const controller = new AbortController();
      pollAbortControllerRef.current = controller;

      const pollInterval = 2000; // Poll every 2 seconds
      const maxPolls = 30; // Max 60 seconds
      let pollCount = 0;

      const poll = async () => {
        if (controller.signal.aborted) return;
        if (activePollJobIdRef.current !== jobId) return;

        if (pollCount >= maxPolls) {
          setConsistencyCheckStatus({
            status: "failed",
            error: "Consistency check timed out",
          });
          return;
        }

        try {
          const response = await fetch(
            `/api/manuscripts/${manuscriptId}/consistency-check?jobId=${jobId}`,
            { signal: controller.signal },
          );

          if (!response.ok) {
            throw new Error("Failed to fetch consistency check status");
          }

          const data = await response.json();
          const job = data.job;

          if (job) {
            if (controller.signal.aborted) return;
            if (activePollJobIdRef.current !== jobId) return;

            setConsistencyCheckStatus({
              status: job.status,
              jobId: job.id,
              error: job.error_message || undefined,
              report: job.report_json || undefined,
            });

            // Continue polling if still in progress
            if (job.status === "queued" || job.status === "running") {
              pollCount++;
              pollTimeoutRef.current = setTimeout(poll, pollInterval);
            }
          } else {
            // Job not found, might have been deleted
            setConsistencyCheckStatus({
              status: "failed",
              error: "Consistency check job not found",
            });
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          console.error("Error polling consistency check status:", error);
          setConsistencyCheckStatus({
            status: "failed",
            error:
              error instanceof Error ? error.message : "Failed to check status",
          });
        }
      };

      poll();
    },
    [manuscriptId],
  );

  // Handle chapter navigation from Binder
  const handleChapterClick = useCallback(
    ({ index }: { title: string; index: number }) => {
      if (editor) {
        editor.commands.setTextSelection(index);
        editor.view.focus();

        // Scroll into view
        const { node } = editor.view.domAtPos(index);
        if (node && node instanceof Element) {
          node.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (node && node.parentElement) {
          node.parentElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    },
    [editor],
  );

  // Tiptap Content change handler
  const handleEditorUpdate = useCallback(
    (data: { json: any; html: string; text: string }) => {
      // AC 8.20.3: Prevent saves while locked
      if (isLocked) return;

      // Determine content changes
      // Ideally we track JSON for rich text data

      // Update local state
      setLocalContent(data.text);
      setContent(data.text); // Keep both in sync for UI components like Binder

      // Trigger autosave
      queueSave(data.json, data.text, title, metadata);
    },
    [queueSave, title, setContent, setLocalContent, metadata, isLocked],
  );

  // Tiptap Selection handler
  const handleEditorSelection = useCallback(
    (editor: Editor) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, " ");

      setSelectionStart(from);
      setSelectionEnd(to);
      setSelectedText(text);

      setSuggestion(null);
      setSuggestionError(null);

      // Ghost text cursor tracking
      setCursorPosition(to); // Use 'to' as cursor position

      if (text.length > 0) {
        ghostText.dismiss();
      }
    },
    [ghostText],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header with title and status - responsive layout */}
      <div
        className={`${isFullscreen ? "hidden" : "flex"} flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 bg-white px-4 md:px-6 py-3 md:py-4`}
      >
        <div className="flex-1 min-w-0 mb-2 md:mb-0">
          <input
            type="text"
            value={title}
            onChange={(e) => !isLocked && handleTitleChange(e.target.value)}
            disabled={isLocked}
            className={`w-full border border-transparent bg-transparent text-xl md:text-2xl font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-100 focus:border-indigo-200 hover:border-slate-200 hover:bg-slate-50/50 rounded-lg px-2 md:px-3 -ml-2 md:-ml-3 transition-all duration-200 ${isLocked ? "cursor-not-allowed opacity-60" : "cursor-text"}`}
            placeholder="Untitled Manuscript"
          />
        </div>
        {/* Scrollable toolbar on mobile */}
        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          {/* ... (Export buttons and other controls remain same) ... */}
          <button
            onClick={() => setShowPublishingRequestModal(true)}
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 transition-colors flex items-center gap-2"
          >
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Publishing
          </button>

          {/* Fullscreen Button (Story 8.9) */}
          <button
            onClick={toggleFullscreen}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            title="Toggle Fullscreen (Cmd+\)"
            data-testid="fullscreen-button"
          >
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
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
            Fullscreen
          </button>

          <button
            onClick={() => setShowBetaShare(true)}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-2"
          >
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
                d="M15 8a3 3 0 10-6 0m6 0a3 3 0 11-6 0m6 0v8a3 3 0 11-6 0V8m10 4a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Share / Beta
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            title="Export Manuscript"
            data-testid="export-button"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export...
          </button>
          {isDictationSupported && (
            <button
              onClick={toggleDictation}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                isListening
                  ? "border-red-400 bg-red-50 text-red-700 animate-pulse"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              title={isListening ? "Stop Dictation" : "Start Dictation"}
            >
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
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              {isListening ? "Listening..." : "Dictate"}
            </button>
          )}
          <button
            onClick={handleCheckConsistency}
            disabled={
              isCheckingConsistency ||
              consistencyCheckStatus.status === "running" ||
              consistencyCheckStatus.status === "queued"
            }
            className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Check manuscript consistency"
          >
            {isCheckingConsistency ||
            consistencyCheckStatus.status === "queued" ||
            consistencyCheckStatus.status === "running" ? (
              <>
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
                {consistencyCheckStatus.status === "queued"
                  ? "Queued..."
                  : consistencyCheckStatus.status === "running"
                    ? "Checking..."
                    : "Starting..."}
              </>
            ) : consistencyCheckStatus.status === "completed" ? (
              <>
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Check Complete
              </>
            ) : consistencyCheckStatus.status === "failed" ? (
              <>
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
                Check Failed
              </>
            ) : (
              <>
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Check Consistency
              </>
            )}
          </button>
          {consistencyCheckStatus.status === "completed" && (
            <button
              onClick={() => {
                if (useNewSidebar) {
                  // AC 8.7.1: Open new sidebar
                  setSidebarOpen(true);
                } else {
                  // Use old modal viewer
                  setSelectedChapterForReport(null);
                  setShowReportViewer(true);
                }
              }}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-2"
            >
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              View Report
            </button>
          )}
          <button
            onClick={() => setShowVersionHistory(true)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Version History
          </button>
          <span className="text-sm text-slate-500">
            {wordCount.toLocaleString()} words
          </span>
          <AutosaveIndicator
            state={state}
            onSaveNow={saveNow}
            disabled={isLocked}
          />
        </div>
      </div>

      {/* Main content area with Binder sidebar and Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Binder Toggle Button - visible only on mobile */}
        <button
          onClick={() => setIsMobileBinderOpen(true)}
          className={`${isFullscreen ? "hidden" : "flex"} fixed bottom-4 left-4 z-40 md:hidden items-center justify-center h-12 w-12 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 transition-colors`}
          title="Open Binder"
          aria-label="Open chapter navigation"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
        </button>

        {/* Mobile Binder Sheet Overlay */}
        <Sheet open={isMobileBinderOpen} onOpenChange={setIsMobileBinderOpen}>
          <SheetContent side="left" className="w-[280px] p-0 overflow-hidden">
            <SheetHeader className="p-4 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm">
              <SheetTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">
                Binder
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100vh-80px)]">
              <Binder
                content={content}
                issues={consistencyCheckStatus.report?.issues}
                onChapterClick={(chapter) => {
                  handleChapterClick(chapter);
                  setIsMobileBinderOpen(false); // Close sheet after navigation
                }}
                onBadgeClick={(chapterIndex) => {
                  setSelectedChapterForReport(chapterIndex);
                  setShowReportViewer(true);
                  setIsMobileBinderOpen(false);
                }}
                className="w-full border-0" // Full width, no border in sheet
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Binder Sidebar - hidden on mobile */}
        <Binder
          content={content}
          issues={consistencyCheckStatus.report?.issues}
          onChapterClick={handleChapterClick}
          onBadgeClick={(chapterIndex) => {
            setSelectedChapterForReport(chapterIndex);
            setShowReportViewer(true);
          }}
          className={`${isFullscreen ? "hidden" : "hidden md:block"}`} // Hide on mobile, show on tablet+
        />

        {/* Editor area - distraction-free, responsive padding */}
        <div
          className={`${isFullscreen ? `fixed inset-0 z-40 ${isDarkMode ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900"}` : "flex-1"} overflow-auto bg-slate-50 transition-colors duration-300`}
          data-testid={isFullscreen ? "fullscreen-overlay" : "editor-main-area"}
        >
          {isFullscreen && (
            <FullscreenControls
              onExit={toggleFullscreen}
              onToggleTheme={toggleTheme}
              isDarkMode={isDarkMode}
              autosaveState={state}
              onSaveNow={saveNow}
              disabled={isLocked}
              onExport={() => setShowExportModal(true)}
              onVersionHistory={() => setShowVersionHistory(true)}
            />
          )}

          <div
            className={`${EDITOR_CONTENT_WRAPPER_CLASSNAME} ${isDarkMode ? "prose-invert" : ""}`}
            data-testid="editor-content-wrapper"
          >
            {/* Service Status Banner - AC 8.20.2, 8.20.3 */}
            {activeServiceRequest && (
              <ServiceStatusBanner
                request={activeServiceRequest}
                onCancelSuccess={() => {
                  // Page will reload on successful cancel, handled in banner
                }}
              />
            )}

            {/* AI Suggestion (if available) - Positioning might need adjustment for Tiptap integration */}
            {suggestion && (
              <AISuggestion
                suggestion={suggestion.suggestion}
                rationale={suggestion.rationale}
                confidence={suggestion.confidence}
                originalText={suggestion.originalText}
                onApply={handleApplySuggestion}
                onDismiss={handleDismissSuggestion}
              />
            )}

            {/* Consistency Report Viewer Modal */}
            {showReportViewer && consistencyCheckStatus.report && (
              <ConsistencyReportViewer
                report={consistencyCheckStatus.report}
                initialChapterFilter={selectedChapterForReport}
                onClose={() => {
                  setShowReportViewer(false);
                  setSelectedChapterForReport(null);
                }}
                onNavigate={(location) => {
                  const index = content.indexOf(location.quote);
                  if (index !== -1 && editor) {
                    setShowReportViewer(false);

                    // Wait for modal to close and visible
                    setTimeout(() => {
                      editor.commands.setTextSelection({
                        from: index,
                        to: index + location.quote.length,
                      });
                      editor.view.focus();

                      // improved scroll into view
                      const { node } = editor.view.domAtPos(index);
                      if (node && node instanceof Element) {
                        node.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }
                    }, 100);
                  } else {
                    // Fallback or alert if text changed
                    alert(
                      "Could not locate the exact text. It might have been modified.",
                    );
                  }
                }}
                onExportPDF={async () => {
                  if (!consistencyCheckStatus.jobId) return;

                  try {
                    const url = `/api/manuscripts/${manuscriptId}/consistency-check/${consistencyCheckStatus.jobId}/export`;

                    const response = await fetch(url);
                    if (!response.ok) throw new Error("Export failed");

                    const blob = await response.blob();
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = downloadUrl;
                    link.download = `consistency-report-${new Date().toISOString().slice(0, 10)}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(downloadUrl);
                  } catch (error) {
                    console.error("PDF Export failed:", error);
                    alert("Failed to export PDF. Please try again.");
                  }
                }}
              />
            )}

            {/* Error & Info Messages */}
            {dictationError && (
              <div className="my-4 rounded-lg border-2 border-red-200 bg-red-50 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-red-800">
                    Dictation Error: {dictationError}
                  </span>
                </div>
              </div>
            )}

            {isListening && (
              <div className="sticky top-0 z-10 mb-4 rounded-lg border border-indigo-200 bg-indigo-50/90 p-3 shadow-sm backdrop-blur-sm animate-fade-in transition-all">
                <div className="flex items-center gap-3">
                  <div className="relative h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </div>
                  <div className="flex-1 font-mono text-sm text-indigo-900">
                    {interimDictationText ? (
                      <span className="text-slate-600">
                        {interimDictationText}
                      </span>
                    ) : (
                      <span className="text-indigo-400 italic">
                        Listening...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {suggestionError && (
              <div className="my-4 rounded-lg border-2 border-red-200 bg-red-50 p-4">
                {/* ... error content ... */}
                <span className="text-sm font-medium text-red-800">
                  {suggestionError}
                </span>
                <button
                  onClick={() => setSuggestionError(null)}
                  className="ml-2 text-red-500"
                >
                  Dismiss
                </button>
              </div>
            )}
            {/* ... other messages ... */}

            {/* Replaced Textarea with TiptapEditor */}
            <TiptapEditor
              content={content} // Initial content, Tiptap manages its own state mostly
              onUpdate={isLocked ? undefined : handleEditorUpdate} // AC 8.20.3: Disable updates when locked
              onSelectionUpdate={handleEditorSelection}
              onEditorReady={setEditor}
              editable={!isLocked} // AC 8.20.3: Set editable to false when locked
              className={`text-lg leading-relaxed ${isLocked ? "opacity-70" : ""} ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}
              placeholder="Start writing..."
              manuscriptId={manuscriptId}
            />

            {/* Ghost Text Overlay - Needs new logic for Tiptap coordinates if we want to overlay absolute */}
            {/* Alternatively, Tiptap extension handles inline phantom text */}
          </div>
        </div>
        <BetaCommentsPanel
          comments={betaComments}
          onResolve={handleResolveBetaComment}
          isLoading={betaCommentsLoading}
        />
      </div>

      {/* Footer - responsive */}
      <div
        className={`${isFullscreen ? "hidden" : "flex"} items-center justify-between border-t border-slate-200 bg-white px-4 md:px-6 py-2 md:py-3 text-sm text-slate-500`}
      >
        <div>{wordCount.toLocaleString()} words</div>
        <div className="hidden md:flex items-center gap-4">
          <span>
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">⌘K</kbd>{" "}
            commands
          </span>
          <span>
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">⌘S</kbd>{" "}
            save
          </span>
        </div>
      </div>

      {/* Modals */}
      <BetaShareModal
        isOpen={showBetaShare}
        onClose={() => setShowBetaShare(false)}
        manuscriptId={manuscriptId}
      />

      <ConflictResolutionModal
        isOpen={showConflictModal}
        onResolve={handleConflictResolve}
        onClose={() => setShowConflictModal(false)}
      />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        manuscriptId={manuscriptId}
        title={title}
        content={editor?.getHTML() || content}
      />
      <ServiceRequestModal
        isOpen={showPublishingRequestModal}
        onClose={() => setShowPublishingRequestModal(false)}
        serviceId="publishing-help"
        serviceTitle="Publishing Assistance"
        manuscriptId={manuscriptId}
        initialMetadata={metadata}
        onMetadataSave={handlePublishingMetadataSave}
      />

      {/* AC 8.7.1: New Consistency Report Sidebar (feature flag controlled) */}
      {useNewSidebar && (
        <ConsistencyReportSidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          report={consistencyCheckStatus.report || null}
          isRunning={
            isCheckingConsistency ||
            consistencyCheckStatus.status === "queued" ||
            consistencyCheckStatus.status === "running"
          }
          onNavigateToIssue={handleNavigateToIssue}
          onApplyFix={handleApplyFix}
          onSaveNow={saveConsistencyEditNow}
          onCancel={handleCancelCheck}
          editor={editor}
        />
      )}

      {/* Command Palette (Cmd+K) */}
      <CommandPalette
        open={commandPalette.isOpen}
        onOpenChange={(open) => {
          if (open) {
            saveSelection(editor, savedCursorPosition);
          }
          commandPalette.setIsOpen(open);
        }}
        commands={commandPalette.commands}
        chapters={chapters}
        characters={characters}
        onNavigate={(target) => {
          if (editor) {
            let pos: number | null = null;
            if (typeof target === "string") {
              pos = findFirstOccurrence(editor, target);
            } else {
              pos = target;
            }

            if (pos !== null) {
              editor.commands.setTextSelection(pos);
              editor.view.focus();
              try {
                const { node } = editor.view.domAtPos(pos);
                if (node instanceof Element) {
                  node.scrollIntoView({ behavior: "smooth", block: "start" });
                } else if (node.parentElement) {
                  node.parentElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              } catch (e) {
                // Ignore scroll errors
              }
            }
          }
        }}
        isLoading={commandPalette.isLoading}
        loadingMessage={commandPalette.loadingMessage}
        placeholder="Type a command (e.g., 'make concise', 'go to chapter 3', 'find John')..."
      />

      {/* Version History Sidebar */}
      {showVersionHistory && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-xl">
          <VersionHistory
            manuscriptId={manuscriptId}
            onRestore={(restoredManuscript) => {
              setShowVersionHistory(false);
              setContent(restoredManuscript.content_text);
              setLocalContent(restoredManuscript.content_text);
              setTitle(restoredManuscript.title);
              resetTimestamp(restoredManuscript.updated_at);
              router.refresh();
            }}
            onClose={() => setShowVersionHistory(false)}
          />
        </div>
      )}
    </div>
  );
}
