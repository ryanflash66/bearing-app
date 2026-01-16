"use client";

/**
 * BlogPostEditor Component
 * Story 6.1: Blog Management (CMS)
 *
 * Rich text editor for blog posts with autosave, title, slug, and publish controls.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import TiptapEditor from "@/components/editor/TiptapEditor";
import { generateSlug } from "@/lib/blog";
import { BlogPostStatus } from "@/types/blog";

interface BlogPostEditorProps {
  postId: string;
  initialTitle: string;
  initialSlug: string;
  initialContent: Record<string, unknown>;
  initialContentText: string;
  initialStatus: BlogPostStatus;
  initialUpdatedAt: string;
}

export default function BlogPostEditor({
  postId,
  initialTitle,
  initialSlug,
  initialContent,
  initialContentText,
  initialStatus,
  initialUpdatedAt,
}: BlogPostEditorProps) {
  const router = useRouter();

  // State
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [contentText, setContentText] = useState(initialContentText);
  const [status, setStatus] = useState(initialStatus);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "idle">("idle");
  const [error, setError] = useState<string | null>(null);

  // Autosave timer ref
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef(false);

  // Auto-generate slug from title if not manually edited
  useEffect(() => {
    if (!slugEdited && title !== initialTitle) {
      setSlug(generateSlug(title));
    }
  }, [title, slugEdited, initialTitle]);

  // Save function
  const save = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveStatus("saving");
    setError(null);

    try {
      const res = await fetch(`/api/blog/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          content_json: content,
          content_text: contentText,
          expectedUpdatedAt: updatedAt,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.conflictDetected) {
          setError("This post was modified elsewhere. Please refresh to see the latest version.");
          setSaveStatus("error");
          return;
        }
        throw new Error(data.error || "Failed to save");
      }

      const savedPost = await res.json();
      setUpdatedAt(savedPost.updated_at);
      setSaveStatus("saved");
      pendingChangesRef.current = false;

      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (err) {
      console.error("Error saving blog post:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [postId, title, slug, content, contentText, updatedAt, isSaving]);

  // Autosave effect
  useEffect(() => {
    if (!pendingChangesRef.current) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    setSaveStatus("idle");
    
    autosaveTimerRef.current = setTimeout(() => {
      save();
    }, 3000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [save, title, slug, content, contentText]); // Re-run when dependencies change

  // Handle content changes from TipTap
  const handleContentChange = useCallback(
    (data: { json: unknown; html: string; text: string }) => {
      setContent(data.json as Record<string, unknown>);
      setContentText(data.text);
      pendingChangesRef.current = true;
    },
    []
  );

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    pendingChangesRef.current = true;
  };

  // Handle slug change
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugEdited(true);
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
    pendingChangesRef.current = true;
  };

  // Publish post
  const handlePublish = async () => {
    // Save first if there are pending changes
    if (pendingChangesRef.current) {
      await save();
    }

    setIsPublishing(true);
    setError(null);

    try {
      const res = await fetch(`/api/blog/posts/${postId}/publish`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish");
      }

      const publishedPost = await res.json();
      setStatus(publishedPost.status);
      setUpdatedAt(publishedPost.updated_at);
    } catch (err) {
      console.error("Error publishing blog post:", err);
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  // Unpublish post
  const handleUnpublish = async () => {
    setIsPublishing(true);
    setError(null);

    try {
      const res = await fetch(`/api/blog/posts/${postId}/unpublish`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unpublish");
      }

      const unpublishedPost = await res.json();
      setStatus(unpublishedPost.status);
      setUpdatedAt(unpublishedPost.updated_at);
    } catch (err) {
      console.error("Error unpublishing blog post:", err);
      setError(err instanceof Error ? err.message : "Failed to unpublish");
    } finally {
      setIsPublishing(false);
    }
  };

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Status badge */}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              status === "published"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {status === "published" ? "Published" : "Draft"}
          </span>

          {/* Save status */}
          <span className="text-sm text-slate-500">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && (
              <span className="text-red-600">Save failed</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Save button */}
          <button
            onClick={save}
            disabled={isSaving || saveStatus === "saving"}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>

          {/* Publish/Unpublish button */}
          {status === "published" ? (
            <button
              onClick={handleUnpublish}
              disabled={isPublishing}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              {isPublishing ? "..." : "Unpublish"}
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl">
          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Post title"
            className="mb-2 w-full border-0 bg-transparent text-4xl font-bold text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-0"
          />

          {/* Slug input */}
          <div className="mb-8 flex items-center gap-2 text-sm text-slate-500">
            <span>/blog/</span>
            <input
              type="text"
              value={slug}
              onChange={handleSlugChange}
              placeholder="post-slug"
              className="flex-1 border-0 border-b border-transparent bg-transparent text-slate-600 placeholder-slate-300 focus:border-slate-300 focus:outline-none focus:ring-0"
            />
          </div>

          {/* Content editor */}
          <TiptapEditor
            content={content}
            editable={true}
            onUpdate={handleContentChange}
            placeholder="Start writing your blog post..."
            className="min-h-[400px]"
          />
        </div>
      </div>
    </div>
  );
}
