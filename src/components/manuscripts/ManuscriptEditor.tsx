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
import Binder from "./Binder";
import { ConsistencyIssue, ConsistencyReport } from "@/lib/gemini";
import { useZenMode } from "@/lib/useZenMode";
import { useGhostText } from "@/lib/useGhostText";
import { GhostTextOverlay } from "./GhostTextDisplay";
import TiptapEditor from "../editor/TiptapEditor";
import { Editor } from "@tiptap/react";
import CommandPalette from "../editor/CommandPalette";
import { useCommandPalette } from "@/lib/useCommandPalette";


interface ManuscriptEditorProps {
  manuscriptId: string;
  initialTitle: string;
  initialContent: string;
  initialUpdatedAt: string;
  onTitleChange?: (title: string) => void;
}

// Status indicator component
function AutosaveIndicator({ state }: { state: AutosaveState }) {
  const getStatusDisplay = () => {
    switch (state.status) {
      case "saving":
        return (
          <span className="flex items-center gap-2 text-amber-600">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved {state.lastSavedAt && `at ${state.lastSavedAt.toLocaleTimeString()}`}
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-2 text-red-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Error saving (retrying...)
          </span>
        );
      case "offline":
        return (
          <span className="flex items-center gap-2 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <span className="text-slate-400">Unsaved changes</span>
        ) : (
          <span className="text-slate-400">Ready</span>
        );
    }
  };

  return (
    <div className="text-sm">
      {getStatusDisplay()}
    </div>
  );
}

export default function ManuscriptEditor({
  manuscriptId,
  initialTitle,
  initialContent,
  initialUpdatedAt,
  onTitleChange,
}: ManuscriptEditorProps) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [localContent, setLocalContent] = useState(initialContent);
  const [serverState, setServerState] = useState<{ content_text: string; title: string } | null>(null);
  
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
  
  // Export state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Consistency check state
  const [consistencyCheckStatus, setConsistencyCheckStatus] = useState<{
    status: "idle" | "queued" | "running" | "completed" | "failed";
    jobId?: string;
    error?: string;
    report?: ConsistencyReport;
  }>({ status: "idle" });
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [selectedChapterForReport, setSelectedChapterForReport] = useState<number | null>(null);

  // Initialize Zen Mode
  const zenMode = useZenMode();

  // Track cursor position for ghost text
  const [cursorPosition, setCursorPosition] = useState(0);

  // Ghost text request handler
  const handleGhostTextRequest = useCallback(async (ctx: string, pos: number): Promise<string | null> => {
    // Get context around cursor (last 500 chars before cursor)
    const contextStart = Math.max(0, pos - 500);
    const contextBefore = ctx.substring(contextStart, pos);
    
    if (contextBefore.trim().length < 20) return null;

    try {
      const response = await fetch(`/api/manuscripts/${manuscriptId}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectionText: contextBefore.slice(-100), // Last 100 chars as context
          instruction: "Continue this text naturally with 1-2 sentences.",
          mode: "ghost",
        }),
      });

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
            } catch { /* skip invalid JSON */ }
          }
        }
      }

      return fullText.trim().substring(0, 150) || null;
    } catch {
      return null;
    }
  }, [manuscriptId]);

  // Handle ghost text acceptance - uses setContent directly to avoid circular dependency
  const handleGhostTextAccept = useCallback((suggestion: string) => {
    const before = content.substring(0, cursorPosition);
    const after = content.substring(cursorPosition);
    const newContent = before + suggestion + after;
    
    // Update content state
    setContent(newContent);
    setLocalContent(newContent);
    
    // Move cursor to end of inserted text
    // Move cursor to end of inserted text
    setTimeout(() => {
      if (editor) {
        const newPos = cursorPosition + suggestion.length;
        editor.commands.setTextSelection(newPos);
        editor.view.focus();
        setCursorPosition(newPos);
      }
    }, 0);
  }, [content, cursorPosition]);

  // Initialize Ghost Text
  const ghostText = useGhostText(content, cursorPosition, {
    pauseMs: 3000, // 3 seconds per AC 2.3.6
    onRequestSuggestion: handleGhostTextRequest,
    onAccept: handleGhostTextAccept,
    enabled: !selectedText && !suggestion && !isLoadingSuggestion,
  });

  // Initialize autosave hook
  const { state, queueSave, saveNow, resetTimestamp } = useAutosave(manuscriptId, initialUpdatedAt, {
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
  });

  // Handle conflict resolution
  const handleConflictResolve = useCallback(async (action: "overwrite" | "reload" | "merge") => {
    const supabase = createClient();

    if (action === "overwrite") {
      // Force save local content (bypass optimistic locking)
      const result = await updateManuscript(
        supabase,
        manuscriptId,
        {
          content_text: localContent,
          content_json: { type: "doc", content: [{ type: "text", text: localContent }] },
        }
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
      const { manuscript, error } = await getManuscript(supabase, manuscriptId);
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
      const result = await updateManuscript(
        supabase,
        manuscriptId,
        {
          content_text: mergedContent,
          content_json: { type: "doc", content: [{ type: "text", text: mergedContent }] },
        }
      );

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
  }, [manuscriptId, localContent, serverState, router, resetTimestamp]);

  // Calculate word count
  useEffect(() => {
    const words = localContent.trim() ? localContent.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [localContent]);

  // Handle content change with autosave
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setLocalContent(newContent); // Track local content for conflict resolution
    queueSave(
      { type: "doc", content: [{ type: "text", text: newContent }] }, // Simple JSON structure
      newContent,
      title
    );
  }, [queueSave, title]);

  // Handle title change with autosave
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    onTitleChange?.(newTitle);
    // Also trigger autosave for title changes
    queueSave(
      { type: "doc", content: [{ type: "text", text: content }] },
      content,
      newTitle
    );
  }, [onTitleChange, queueSave, content]);

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
          errorMessage = await response.text() || errorMessage;
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
                    console.warn(`First chunk took ${timeToFirstChunk}ms (target: <500ms)`);
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
                  console.warn(`Suggestion took ${elapsed}ms (target: <2000ms)`);
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
        error instanceof Error ? error.message : "Failed to get suggestion"
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

  // Export handlers
  const handleExport = useCallback(async (format: "pdf" | "docx", versionId?: number) => {
    if (format === "pdf") setIsExportingPdf(true);
    else setIsExportingDocx(true);
    
    setExportError(null);

    try {
      const url = `/api/manuscripts/${manuscriptId}/export/${format}${
        versionId !== undefined ? `?version=${versionId}` : ""
      }`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Export failed" }));
        throw new Error(errorData.error || "Failed to export manuscript");
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${title || "manuscript"}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error exporting manuscript:", error);
      setExportError(
        error instanceof Error ? error.message : "Failed to export manuscript"
      );
    } finally {
      setIsExportingPdf(false);
      setIsExportingDocx(false);
    }
  }, [manuscriptId, title]);

  // Handle consistency check trigger
  const handleCheckConsistency = useCallback(async () => {
    setIsCheckingConsistency(true);
    setConsistencyCheckStatus({ status: "queued" });
    setExportError(null);

    try {
      const response = await fetch(`/api/manuscripts/${manuscriptId}/consistency-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to start consistency check" }));
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
      console.error("Error starting consistency check:", error);
      setConsistencyCheckStatus({
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to start consistency check",
      });
    } finally {
      setIsCheckingConsistency(false);
    }
  }, [manuscriptId]);

  // Poll consistency check status
  const pollConsistencyCheckStatus = useCallback(async (jobId: string) => {
    const pollInterval = 2000; // Poll every 2 seconds
    const maxPolls = 30; // Max 60 seconds
    let pollCount = 0;

    const poll = async () => {
      if (pollCount >= maxPolls) {
        setConsistencyCheckStatus({
          status: "failed",
          error: "Consistency check timed out",
        });
        return;
      }

      try {
        const response = await fetch(
          `/api/manuscripts/${manuscriptId}/consistency-check?jobId=${jobId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch consistency check status");
        }

        const data = await response.json();
        const job = data.job;

        if (job) {
          setConsistencyCheckStatus({
            status: job.status,
            jobId: job.id,
            error: job.error_message || undefined,
            report: job.report_json || undefined,
          });

          // Continue polling if still in progress
          if (job.status === "queued" || job.status === "running") {
            pollCount++;
            setTimeout(poll, pollInterval);
          }
        } else {
          // Job not found, might have been deleted
          setConsistencyCheckStatus({
            status: "failed",
            error: "Consistency check job not found",
          });
        }
      } catch (error) {
        console.error("Error polling consistency check status:", error);
        setConsistencyCheckStatus({
          status: "failed",
          error: error instanceof Error ? error.message : "Failed to check status",
        });
      }
    };

    poll();
  }, [manuscriptId]);

  // Handle chapter navigation from Binder
  const handleChapterClick = useCallback(({ index }: { title: string; index: number }) => {
    if (editor) {
      editor.commands.setTextSelection(index);
      editor.view.focus();
      
      // Scroll into view
      const { node } = editor.view.domAtPos(index);
      if (node && node instanceof Element) {
          node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (node && node.parentElement) {
          node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [editor]);

  // Save on Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveNow();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveNow]);

  // Tiptap Content change handler
  const handleEditorUpdate = useCallback((data: { json: any; html: string; text: string }) => {
    // Determine content changes
    // Ideally we track JSON for rich text data
    
    // Update local state
    setLocalContent(data.text); 
    setContent(data.text); // Keep both in sync for UI components like Binder
    
    // Trigger autosave
    queueSave(
      data.json,
      data.text,
      title
    );
  }, [queueSave, title, setContent, setLocalContent]);

  // Tiptap Selection handler
  const handleEditorSelection = useCallback((editor: Editor) => {
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
  }, [ghostText]);

  return (
    <div className={`flex h-full flex-col transition-all duration-300 ${zenMode.isActive ? 'zen-mode' : ''}`}>
      {/* ... (Header and Zen Mode Indicator remain same) ... */}
      {zenMode.isActive && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-lg animate-fade-in">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          Zen Mode
          <button
            onClick={zenMode.disable}
            className="ml-1 rounded-full p-0.5 hover:bg-indigo-500 transition-colors"
            title="Exit Zen Mode (Cmd+\\)"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header with title and status */}
      <div className={`flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 transition-all duration-300 ${zenMode.isActive ? 'opacity-0 h-0 overflow-hidden py-0 border-0' : ''}`}>
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full border border-transparent bg-transparent text-2xl font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-100 focus:border-indigo-200 hover:border-slate-200 hover:bg-slate-50/50 rounded-lg px-3 -ml-3 transition-all duration-200 cursor-text"
            placeholder="Untitled Manuscript"
          />
        </div>
        <div className="flex items-center gap-4">
           {/* ... (Export buttons and other controls remain same) ... */}
            <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("pdf")}
              disabled={isExportingPdf || isExportingDocx}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Download as PDF"
            >
              {isExportingPdf ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export PDF
                </>
              )}
            </button>
            <button
              onClick={() => handleExport("docx")}
              disabled={isExportingPdf || isExportingDocx}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Download as DOCX"
            >
              {isExportingDocx ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export DOCX
                </>
              )}
            </button>
          </div>
          <button
            onClick={handleCheckConsistency}
            disabled={isCheckingConsistency || consistencyCheckStatus.status === "running" || consistencyCheckStatus.status === "queued"}
            className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Check manuscript consistency"
          >
             {isCheckingConsistency || consistencyCheckStatus.status === "queued" || consistencyCheckStatus.status === "running" ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {consistencyCheckStatus.status === "queued" ? "Queued..." : consistencyCheckStatus.status === "running" ? "Checking..." : "Starting..."}
              </>
            ) : consistencyCheckStatus.status === "completed" ? (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Check Complete
              </>
            ) : consistencyCheckStatus.status === "failed" ? (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Check Failed
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Check Consistency
              </>
            )}
          </button>
           {consistencyCheckStatus.status === "completed" && (
            <button
              onClick={() => {
                setSelectedChapterForReport(null);
                setShowReportViewer(true);
              }}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
          <button
            onClick={zenMode.toggle}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              zenMode.isActive
                ? 'border-indigo-400 bg-indigo-100 text-indigo-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title={zenMode.isActive ? 'Exit Zen Mode (Cmd+\\)' : 'Enter Zen Mode (Cmd+\\)'}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            {zenMode.isActive ? 'Exit Zen' : 'Zen'}
          </button>
          <AutosaveIndicator state={state} />
        </div>
      </div>

      {/* Main content area with Binder sidebar and Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Binder Sidebar - hidden in Zen mode */}
        {!zenMode.isActive && (
          <Binder
            content={content}
            issues={consistencyCheckStatus.report?.issues}
            onChapterClick={handleChapterClick}
            onBadgeClick={(chapterIndex) => {
              setSelectedChapterForReport(chapterIndex);
              setShowReportViewer(true);
            }}
            className="hidden md:block" // Hide on mobile by default
          />
        )}

      {/* Editor area - distraction-free */}
      <div className={`flex-1 overflow-auto transition-colors duration-300 ${zenMode.isActive ? 'bg-[#FDF7E9]' : 'bg-slate-50'}`}>
          <div className={`mx-auto px-8 py-12 transition-all duration-300 ${zenMode.isActive ? 'max-w-2xl' : 'max-w-3xl'}`}>
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
                    editor.commands.setTextSelection({ from: index, to: index + location.quote.length });
                    editor.view.focus();
                    
                    // improved scroll into view
                    const { node } = editor.view.domAtPos(index);
                    if (node && node instanceof Element) {
                        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                } else {
                  // Fallback or alert if text changed
                  alert("Could not locate the exact text. It might have been modified.");
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
          {suggestionError && (
            <div className="my-4 rounded-lg border-2 border-red-200 bg-red-50 p-4">
               {/* ... error content ... */}
               <span className="text-sm font-medium text-red-800">{suggestionError}</span>
               <button onClick={() => setSuggestionError(null)} className="ml-2 text-red-500">Dismiss</button>
            </div>
          )}
          {/* ... other messages ... */}

           {/* Replaced Textarea with TiptapEditor */}
           <TiptapEditor
              content={content} // Initial content, Tiptap manages its own state mostly
              onUpdate={handleEditorUpdate}
              onSelectionUpdate={handleEditorSelection}
              onEditorReady={setEditor}
              className="text-lg leading-relaxed text-slate-800"
              placeholder="Start writing..."
           />

           {/* Ghost Text Overlay - Needs new logic for Tiptap coordinates if we want to overlay absolute */}
           {/* Alternatively, Tiptap extension handles inline phantom text */}
          </div>
        </div>
      </div>
      
       {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3 text-sm text-slate-500">
        <div>
          {wordCount.toLocaleString()} words
        </div>
        <div>
          Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">Ctrl+S</kbd> to save immediately
        </div>
      </div>

      {/* Modals */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        onResolve={handleConflictResolve}
        onClose={() => setShowConflictModal(false)}
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

