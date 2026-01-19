"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface BetaReaderManuscript {
  id: string;
  title: string;
  content_text: string;
}

interface BetaReaderClientProps {
  manuscript: BetaReaderManuscript;
  token: string;
  permissions: "read" | "comment";
}

type CommentType = "General Feedback" | "Typo/Grammar";

export default function BetaReaderClient({
  manuscript,
  token,
  permissions,
}: BetaReaderClientProps) {
  const canComment = permissions === "comment";
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [selectionText, setSelectionText] = useState("");
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState<CommentType>("General Feedback");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paragraphs = useMemo(
    () => manuscript.content_text.split(/\n{2,}/).filter(Boolean),
    [manuscript.content_text]
  );

  useEffect(() => {
    if (!canComment) return;
    const stored = localStorage.getItem(`beta-reader-name:${token}`);
    if (stored) {
      setDisplayName(stored);
    }
  }, [canComment, token]);

  const handleSaveName = () => {
    if (!nameInput.trim()) return;
    const trimmed = nameInput.trim();
    setDisplayName(trimmed);
    localStorage.setItem(`beta-reader-name:${token}`, trimmed);
  };

  const clearSelection = () => {
    setSelectionText("");
    setSelectionRect(null);
    setCommentText("");
    setCommentType("General Feedback");
    setSubmitError(null);
  };

  const handleSelection = () => {
    if (!canComment || !contentRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      clearSelection();
      return;
    }

    if (!contentRef.current.contains(selection.anchorNode)) {
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      clearSelection();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionText(text);
    setSelectionRect(rect);
  };

  const handleSubmitComment = async () => {
    if (!selectionText || !commentText.trim()) {
      setSubmitError("Please enter a comment before submitting.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/beta/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-beta-token": token,
        },
        body: JSON.stringify({
          manuscriptId: manuscript.id,
          selectedText: selectionText,
          commentText: commentText.trim(),
          authorName: displayName,
          type: commentType,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to submit comment" }));
        throw new Error(data.error || "Failed to submit comment");
      }

      clearSelection();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (canComment && !displayName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl">
          <h1 className="text-2xl font-bold">Enter your display name</h1>
          <p className="mt-2 text-sm text-slate-400">
            Commenting requires a name so the author can identify your feedback.
          </p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            onClick={handleSaveName}
            className="mt-4 w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
          >
            Continue to Reader Mode
          </button>
        </div>
      </div>
    );
  }

  const fontSizeClass = fontSize === "sm" ? "text-base" : fontSize === "lg" ? "text-xl" : "text-lg";
  const themeClasses =
    theme === "dark"
      ? "bg-slate-950 text-slate-100"
      : "bg-[#fdf8ee] text-slate-900";

  return (
    <div className={`min-h-screen ${themeClasses}`}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/40 bg-white/70 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-500">Beta Reader</p>
          <h1 className="text-2xl font-bold">{manuscript.title}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
            <span className="text-xs text-slate-500">Text</span>
            <button
              onClick={() => setFontSize("sm")}
              className={`rounded-full px-2 py-1 ${fontSize === "sm" ? "bg-slate-100" : ""}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize("md")}
              className={`rounded-full px-2 py-1 ${fontSize === "md" ? "bg-slate-100" : ""}`}
            >
              A+
            </button>
            <button
              onClick={() => setFontSize("lg")}
              className={`rounded-full px-2 py-1 ${fontSize === "lg" ? "bg-slate-100" : ""}`}
            >
              A++
            </button>
          </div>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
          >
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div
          ref={contentRef}
          onMouseUp={handleSelection}
          className={`${fontSizeClass} leading-relaxed`}
        >
          {paragraphs.length > 0 ? (
            paragraphs.map((para, index) => (
              <p key={`${index}-${para.slice(0, 20)}`} className="mb-6 whitespace-pre-wrap">
                {para}
              </p>
            ))
          ) : (
            <p className="text-slate-500">No manuscript content available.</p>
          )}
        </div>
      </main>

      {canComment && selectionText && selectionRect && (
        <div
          className="absolute z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
          style={{
            top: selectionRect.bottom + window.scrollY + 12,
            left: selectionRect.left + window.scrollX,
          }}
        >
          <div className="mb-2 text-xs font-semibold uppercase text-slate-400">Add Comment</div>
          <div className="mb-2 line-clamp-2 text-xs text-slate-500">
            “{selectionText.slice(0, 140)}{selectionText.length > 140 ? "..." : ""}”
          </div>
          <select
            value={commentType}
            onChange={(e) => setCommentType(e.target.value as CommentType)}
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
          >
            <option value="General Feedback">General Feedback</option>
            <option value="Typo/Grammar">Typo/Grammar</option>
          </select>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your feedback..."
            className="mb-2 h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
          />
          {submitError && (
            <div className="mb-2 text-xs text-red-500">{submitError}</div>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={clearSelection}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitComment}
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
