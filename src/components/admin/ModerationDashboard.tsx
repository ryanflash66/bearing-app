"use client";

import { useState } from "react";
import { ModerationPost } from "@/lib/moderation";

interface ModerationDashboardProps {
  initialPosts: ModerationPost[];
}

export default function ModerationDashboard({
  initialPosts,
}: ModerationDashboardProps) {
  const [posts, setPosts] = useState<ModerationPost[]>(initialPosts);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showReasonModal, setShowReasonModal] = useState<string | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const callModerationApi = async <T,>(path: string, body: Record<string, unknown>) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = typeof payload?.error === "string" ? payload.error : "Request failed";
      throw new Error(message);
    }

    return payload as T;
  };

  const handleSuspend = async (postId: string) => {
    setShowReasonModal(postId);
    setSuspensionReason("Content policy violation");
  };

  const confirmSuspend = async () => {
    if (!showReasonModal) return;

    const postId = showReasonModal;
    setShowReasonModal(null);
    setLoading(postId);
    setError(null);
    setSuccessMessage(null);
    setPendingAction("suspend");

    try {
      const result = await callModerationApi<{
        success: boolean;
        postId?: string;
        authorEmail?: string;
        title?: string;
        emailSent?: boolean;
      }>("/api/admin/moderation/suspend", {
        postId,
        reason: suspensionReason || "Content policy violation",
      });

      // Update local state
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                status: "suspended",
                suspended_at: new Date().toISOString(),
                suspension_reason: suspensionReason,
                is_flagged: true,
                flagged_at: new Date().toISOString(),
                flag_reason: suspensionReason,
                flag_source: "admin",
              }
            : p
        )
      );

      const emailNote = result.authorEmail
        ? result.emailSent
          ? `Email sent to ${result.authorEmail}.`
          : `Email failed for ${result.authorEmail}.`
        : "Email notification unavailable.";

      setSuccessMessage(`Post "${result.title || "Untitled"}" suspended. ${emailNote}`);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to suspend post";
      setError(errorMessage);
    } finally {
      setLoading(null);
      setSuspensionReason("");
      setPendingAction(null);
    }
  };

  const handleRestore = async (postId: string) => {
    setLoading(postId);
    setError(null);
    setSuccessMessage(null);
    setPendingAction("restore");

    try {
      await callModerationApi<{ success: boolean }>("/api/admin/moderation/restore", {
        postId,
      });

      // Update local state
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                status: "published",
                suspended_at: null,
                suspension_reason: null,
                is_flagged: false,
                flagged_at: null,
                flag_reason: null,
                flag_source: null,
                flag_confidence: null,
              }
            : p
        )
      );

      setSuccessMessage("Post restored to published status.");
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to restore post";
      setError(errorMessage);
    } finally {
      setLoading(null);
      setPendingAction(null);
    }
  };

  const flaggedPosts = posts.filter((p) => p.is_flagged && p.status !== "suspended");
  const suspendedPosts = posts.filter((p) => p.status === "suspended");
  const publishedPosts = posts.filter(
    (p) => p.status === "published" && !p.is_flagged
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleApprove = async (postId: string) => {
    setLoading(postId);
    setError(null);
    setSuccessMessage(null);
    setPendingAction("approve");

    try {
      await callModerationApi<{ success: boolean }>("/api/admin/moderation/approve", {
        postId,
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_flagged: false,
                flagged_at: null,
                flag_reason: null,
                flag_source: null,
                flag_confidence: null,
              }
            : p
        )
      );

      setSuccessMessage("Post approved. Flag cleared.");
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to approve post";
      setError(errorMessage);
    } finally {
      setLoading(null);
      setPendingAction(null);
    }
  };

  const PostRow = ({ post }: { post: ModerationPost }) => {
    const isSuspended = post.status === "suspended";
    const isFlagged = post.is_flagged && !isSuspended;
    const isLoading = loading === post.id;

    return (
      <tr
        className={`border-b border-slate-100 ${
          isSuspended ? "bg-red-50" : isFlagged ? "bg-amber-50" : "hover:bg-slate-50"
        }`}
      >
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{post.title}</span>
            <span className="text-xs text-slate-500">/{post.slug}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm text-slate-900">
              {post.author_display_name || post.author_email}
            </span>
            {post.author_handle && (
              <span className="text-xs text-slate-500">@{post.author_handle}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                isSuspended
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {post.status}
            </span>
            {isFlagged && (
              <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                flagged
              </span>
            )}
          </div>
          {isSuspended && post.suspension_reason && (
            <p className="mt-1 text-xs text-red-600">{post.suspension_reason}</p>
          )}
          {isFlagged && post.flag_reason && (
            <p className="mt-1 text-xs text-amber-700">{post.flag_reason}</p>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">
          {formatDate(isSuspended ? post.suspended_at : post.published_at)}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">
          {post.views_count.toLocaleString()}
        </td>
        <td className="px-4 py-3">
          {isSuspended ? (
            <button
              onClick={() => handleRestore(post.id)}
              disabled={isLoading}
              className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading && pendingAction === "restore" ? "..." : "Restore"}
            </button>
          ) : isFlagged ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleApprove(post.id)}
                disabled={isLoading}
                className="rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {isLoading && pendingAction === "approve" ? "..." : "Approve"}
              </button>
              {post.status === "published" && (
                <button
                  onClick={() => handleSuspend(post.id)}
                  disabled={isLoading}
                  className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading && pendingAction === "suspend" ? "..." : "Takedown"}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => handleSuspend(post.id)}
              disabled={isLoading}
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading && pendingAction === "suspend" ? "..." : "Takedown"}
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Flagged Posts Section */}
      {flaggedPosts.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-amber-700">
            Flagged Posts ({flaggedPosts.length})
          </h3>
          <div className="overflow-hidden rounded-lg border border-amber-200 bg-white">
            <table className="min-w-full">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Post
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Author
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Published
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Views
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {flaggedPosts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suspended Posts Section */}
      {suspendedPosts.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-red-700">
            Suspended Posts ({suspendedPosts.length})
          </h3>
          <div className="overflow-hidden rounded-lg border border-red-200 bg-white">
            <table className="min-w-full">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">
                    Post
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">
                    Author
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">
                    Suspended
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">
                    Views
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {suspendedPosts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Published Posts Section */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">
          Published Posts ({publishedPosts.length})
        </h3>
        {publishedPosts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            No published posts to moderate.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Post
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Author
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Published
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Views
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {publishedPosts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspension Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Suspend Post
            </h3>
            <p className="mb-4 text-sm text-slate-600">
              This will make the post inaccessible to the public (404). The author
              will need to be notified separately.
            </p>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Suspension Reason
              </span>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Content policy violation..."
              />
            </label>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowReasonModal(null);
                  setSuspensionReason("");
                }}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmSuspend}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
