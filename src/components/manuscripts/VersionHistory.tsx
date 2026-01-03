"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { getVersionHistory, restoreVersion, ManuscriptVersion } from "@/lib/manuscriptVersions";
import VersionRestoreModal from "./VersionRestoreModal";

interface VersionHistoryProps {
  manuscriptId: string;
  onRestore?: (manuscript: any) => void;
  onClose?: () => void;
}

export default function VersionHistory({ manuscriptId, onRestore, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<ManuscriptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null); // version_num being restored
  const [exporting, setExporting] = useState<string | null>(null); // version_num being exported
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<number | null>(null);

  const supabase = createClient();

  // Load versions
  const loadVersions = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(null);

    const result = await getVersionHistory(supabase, manuscriptId, 30, cursor);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (cursor) {
      // Append to existing versions (pagination)
      setVersions((prev) => [...prev, ...result.versions]);
    } else {
      // Replace versions (initial load)
      setVersions(result.versions);
    }

    setHasMore(result.hasMore);
    setNextCursor(result.nextCursor);
    setLoading(false);
  }, [supabase, manuscriptId]);

  // Initial load
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  // Handle export
  const handleExport = useCallback(async (versionNum: number, format: "pdf" | "docx") => {
    if (exporting) return; // Prevent multiple simultaneous exports

    setExporting(`${versionNum}-${format}`);
    setError(null);

    try {
      const url = `/api/manuscripts/${manuscriptId}/export/${format}?version=${versionNum}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Export failed" }));
        throw new Error(errorData.error || "Failed to export version");
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `version-${versionNum}.${format}`;
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
    } catch (err) {
      console.error("Error exporting version:", err);
      setError(err instanceof Error ? err.message : "Failed to export version");
    } finally {
      setExporting(null);
    }
  }, [manuscriptId, exporting]);

  // Handle restore
  const handleRestoreClick = (versionNum: number) => {
    setVersionToRestore(versionNum);
    setShowRestoreModal(true);
  };

  const executeRestore = async () => {
    if (!versionToRestore || restoring) return;

    setRestoring(versionToRestore.toString());
    setError(null);

    const result = await restoreVersion(supabase, manuscriptId, versionToRestore);

    if (result.error || !result.manuscript) {
      setError(result.error || "Failed to restore manuscript data");
      setRestoring(null);
      return;
    }

    // Reload versions to show the new restore version
    await loadVersions();

    setRestoring(null);
    setShowRestoreModal(false);
    onRestore?.(result.manuscript);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-slate-900">Version History</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Version list */}
      <div className="flex-1 overflow-auto">
        {loading && versions.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-slate-500">Loading versions...</div>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-slate-500">
              <p className="mb-2">No versions yet</p>
              <p className="text-sm">Versions will appear here as you edit your manuscript</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {versions.map((version) => (
              <div
                key={version.id}
                className="px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-slate-900">
                        Version {version.version_num}
                      </span>
                      <span className="text-sm text-slate-500">
                        {formatTimestamp(version.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mb-1">
                      <span className="font-medium">Title:</span> {version.title}
                    </div>
                    <div className="text-sm text-slate-500">
                      {version.content_text.length.toLocaleString()} characters
                      {" • "}
                      {version.content_text.trim()
                        ? version.content_text.trim().split(/\s+/).length.toLocaleString()
                        : 0}{" "}
                      words
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleExport(version.version_num, "pdf")}
                        disabled={!!exporting}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Export as PDF"
                      >
                        {exporting === `${version.version_num}-pdf` ? (
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          "PDF"
                        )}
                      </button>
                      <button
                        onClick={() => handleExport(version.version_num, "docx")}
                        disabled={!!exporting}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Export as DOCX"
                      >
                        {exporting === `${version.version_num}-docx` ? (
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          "DOCX"
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => handleRestoreClick(version.version_num)}
                      disabled={restoring === version.version_num.toString()}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {restoring === version.version_num.toString() ? (
                        <span className="flex items-center gap-2">
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
                          Restoring...
                        </span>
                      ) : (
                        "Restore"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load more button */}
      {hasMore && !loading && (
        <div className="border-t border-slate-200 px-6 py-4">
          <button
            onClick={() => loadVersions(nextCursor || undefined)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Load More Versions
          </button>
        </div>
      )}

      {loading && versions.length > 0 && (
        <div className="border-t border-slate-200 px-6 py-4 text-center text-sm text-slate-500">
          Loading more versions...
        </div>
      )}
      <VersionRestoreModal
        isOpen={showRestoreModal}
        versionNum={versionToRestore}
        onConfirm={executeRestore}
        onCancel={() => setShowRestoreModal(false)}
        isLoading={!!restoring}
      />
    </div>
  );
}

