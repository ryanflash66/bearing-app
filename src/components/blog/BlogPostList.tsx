"use client";

/**
 * BlogPostList Component
 * Story 6.1: Blog Management (CMS)
 *
 * Displays a list of blog posts with status badges and metrics.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BlogPostListItem } from "@/types/blog";

interface BlogPostListProps {
  initialPosts: BlogPostListItem[];
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    published: "bg-emerald-100 text-emerald-700",
    archived: "bg-slate-100 text-slate-500",
  };

  const labels: Record<string, string> = {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.draft}`}
    >
      {labels[status] || status}
    </span>
  );
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(num: number) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function BlogPostList({ initialPosts }: BlogPostListProps) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (postId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/blog/posts/${postId}/archive`, {
        method: "POST",
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setDeleteConfirm(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to archive post");
      }
    } catch (error) {
      console.error("Error archiving post:", error);
      alert("Failed to archive post");
    } finally {
      setIsDeleting(false);
    }
  };

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-slate-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-slate-900">
          No blog posts yet
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Get started by creating your first blog post.
        </p>
        <Link
          href="/dashboard/marketing/blog/new"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Post
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-200">
          {posts.map((post) => (
            <li key={post.id} className="group relative">
              <Link
                href={`/dashboard/marketing/blog/${post.id}`}
                className="block px-6 py-5 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-medium text-slate-900 group-hover:text-blue-600">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                      {getStatusBadge(post.status)}
                      <span className="flex items-center gap-1">
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        {formatNumber(post.views_count)} views
                      </span>
                      <span>{formatNumber(post.word_count)} words</span>
                      <span>Updated {formatDate(post.updated_at)}</span>
                      {post.published_at && (
                        <span>Published {formatDate(post.published_at)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteConfirm(post.id);
                    }}
                    className="ml-4 rounded p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    title="Archive post"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-slate-900">
              Archive Blog Post?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              This will remove the post from your blog. You can restore it later
              from the archived posts.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
