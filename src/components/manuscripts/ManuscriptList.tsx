"use client";

import { useState } from "react";
import Link from "next/link";
import { Manuscript } from "@/lib/manuscripts";

interface ManuscriptListProps {
  manuscripts: Manuscript[];
  onDelete: (id: string) => Promise<void>;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadge(status: Manuscript["status"]) {
  const styles = {
    draft: "bg-slate-100 text-slate-700",
    in_review: "bg-amber-100 text-amber-700",
    ready: "bg-blue-100 text-blue-700",
    published: "bg-emerald-100 text-emerald-700",
    archived: "bg-slate-100 text-slate-500",
  };

  const labels = {
    draft: "Draft",
    in_review: "In Review",
    ready: "Ready",
    published: "Published",
    archived: "Archived",
  };

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function ManuscriptList({ manuscripts, onDelete }: ManuscriptListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
      setShowConfirmDelete(null);
    }
  };

  if (manuscripts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-slate-900">No manuscripts yet</h3>
        <p className="mt-2 text-sm text-slate-500">
          Get started by creating your first manuscript.
        </p>
        <Link
          href="/dashboard/manuscripts/new"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Manuscript
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {manuscripts.map((manuscript) => (
        <div key={manuscript.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <Link
            href={`/dashboard/manuscripts/${manuscript.id}`}
            className="block p-5 transition-colors hover:bg-slate-50"
          >
            <div className="flex flex-col h-full">
              <h3 className="truncate text-lg font-medium text-slate-900 group-hover:text-blue-600">
                {manuscript.title || "Untitled"}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                {getStatusBadge(manuscript.status)}
                <span className="hidden sm:inline">•</span>
                <span>{manuscript.word_count.toLocaleString()} words</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Updated {formatDate(manuscript.updated_at)}
              </p>
            </div>
          </Link>
          {/* Delete button - always visible on mobile for touch accessibility */}
          <div className="absolute top-3 right-3">
            {showConfirmDelete === manuscript.id ? (
              <div
                className="flex items-center gap-2 rounded-lg bg-white p-1 shadow-lg"
                onClick={(e) => e.preventDefault()}
              >
                <button
                  onClick={() => handleDelete(manuscript.id)}
                  disabled={deletingId === manuscript.id}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 min-h-[44px] min-w-[44px]"
                >
                  {deletingId === manuscript.id ? "..." : "Delete"}
                </button>
                <button
                  onClick={() => setShowConfirmDelete(null)}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 min-h-[44px] min-w-[44px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowConfirmDelete(manuscript.id);
                }}
                className="rounded-lg p-2 text-slate-400 opacity-100 md:opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/80 md:bg-transparent"
                title="Delete manuscript"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

