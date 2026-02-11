"use client";

/**
 * @deprecated This component is deprecated as of Story 8.7 and will be removed after a 2-week validation period.
 * Use ConsistencyReportSidebar instead, which provides an integrated sidebar experience with enhanced features.
 * Target removal date: After NEXT_PUBLIC_CONSISTENCY_SIDEBAR has been enabled in production for 2 weeks with zero P0/P1 bugs.
 */

import { useState, useMemo } from "react";
import { ConsistencyReport, ConsistencyIssue } from "@/lib/gemini";

interface ConsistencyReportViewerProps {
  report: ConsistencyReport;
  onClose: () => void;
  onApplyFix?: (issue: ConsistencyIssue) => void;
  onNavigate?: (location: { quote: string; chapter?: number | null }) => void;
  onExportPDF?: () => void;
  initialChapterFilter?: number | null;
}

type IssueType = "character" | "plot" | "timeline" | "tone";
type Severity = "low" | "medium" | "high";

export default function ConsistencyReportViewer({
  report,
  onClose,
  onApplyFix,
  onNavigate,
  onExportPDF,
  initialChapterFilter,
}: ConsistencyReportViewerProps) {
  const [activeTab, setActiveTab] = useState<IssueType | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(
    new Set(["low", "medium", "high"] as Severity[])
  );

  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [activeTab, severityFilter]);

  const toggleSeverity = (severity: Severity) => {
    const newFilter = new Set(severityFilter);
    if (newFilter.has(severity)) {
      newFilter.delete(severity);
    } else {
      newFilter.add(severity);
    }
    setSeverityFilter(newFilter);
  };

  const [selectedChapter, setSelectedChapter] = useState<number | null>(
    initialChapterFilter || null
  );

  const filteredIssues = useMemo(() => {
    return report.issues.filter((issue) => {
      const typeMatch = activeTab === "all" || issue.type === activeTab;
      const severityMatch = severityFilter.has(issue.severity);
      const chapterMatch = selectedChapter === null || issue.location.chapter === selectedChapter;
      return typeMatch && severityMatch && chapterMatch;
    });
  }, [report.issues, activeTab, severityFilter, selectedChapter]);

  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredIssues.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredIssues, currentPage]);

  const totalPages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE);

  const stats = useMemo(() => {
    return {
      character: report.issues.filter((i) => i.type === "character").length,
      plot: report.issues.filter((i) => i.type === "plot").length,
      timeline: report.issues.filter((i) => i.type === "timeline").length,
      tone: report.issues.filter((i) => i.type === "tone").length,
      total: report.issues.length,
    };
  }, [report.issues]);

  const severityColor = (severity: Severity) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Consistency Report</h2>
            <p className="text-sm text-slate-500">
              Found {stats.total} issues in your manuscript
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        {report.summary && (
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Summary: </span>
            {report.summary}
          </div>
        )}

        {/* Filters and Tabs */}
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
          {/* Type Tabs */}
          <div className="flex space-x-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("character")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "character"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Character ({stats.character})
            </button>
            <button
              onClick={() => setActiveTab("plot")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "plot"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Plot ({stats.plot})
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "timeline"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Timeline ({stats.timeline})
            </button>
            <button
              onClick={() => setActiveTab("tone")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "tone"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Tone ({stats.tone})
            </button>
          </div>

          {/* Severity Filters */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase text-slate-500">Filter by severity:</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-xs cursor-pointer select-none hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={severityFilter.has("high")}
                  onChange={() => toggleSeverity("high")}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-red-700 font-medium">High</span>
              </label>
              <label className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-xs cursor-pointer select-none hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={severityFilter.has("medium")}
                  onChange={() => toggleSeverity("medium")}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-orange-700 font-medium">Medium</span>
              </label>
              <label className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-xs cursor-pointer select-none hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={severityFilter.has("low")}
                  onChange={() => toggleSeverity("low")}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-blue-700 font-medium">Low</span>
              </label>
            </div>
          </div>
        </div>

        {/* Issues List */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6" ref={(el) => { if (el) el.scrollTop = 0; }}>
          <div className="space-y-4">
            {selectedChapter !== null && (
              <div className="mb-4 flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                <span className="font-medium">
                  Showing issues for Chapter {selectedChapter}
                </span>
                <button
                  onClick={() => setSelectedChapter(null)}
                  className="text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  View All Chapters
                </button>
              </div>
            )}
            
            {filteredIssues.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white text-center">
                <p className="text-slate-500">No issues found matching your filters.</p>
              </div>
            ) : (
              paginatedIssues.map((issue, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between border-b border-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${severityColor(
                          issue.severity
                        )}`}
                      >
                        {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)} Severity
                      </span>
                      <span className="text-sm font-medium text-slate-500 capitalize">
                        {issue.type} Issue
                      </span>
                      {issue.location.chapter && (
                        <span className="text-xs text-slate-400">
                          Chapter {issue.location.chapter}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* Quote Context */}
                    <div className="mb-4 flex items-start justify-between gap-4 rounded bg-slate-50 p-3 italic text-slate-600 border-l-4 border-slate-200">
                      <span>"{issue.location.quote}"</span>
                      {onNavigate && (
                        <button
                          onClick={() => onNavigate(issue.location)}
                          className="flex-shrink-0 rounded text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Locate
                        </button>
                      )}
                    </div>

                    {/* Explanation */}
                    <p className="mb-3 text-slate-800">{issue.explanation}</p>

                    {/* Suggestion */}
                    {issue.suggestion && (
                      <div className="mt-3 flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
                        <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div>
                          <span className="font-semibold">Suggestion: </span>
                          {issue.suggestion}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Pagination Controls */}
          {filteredIssues.length > ITEMS_PER_PAGE && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(report, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `consistency-report-${new Date().toISOString().slice(0, 10)}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Export JSON
              </button>
              {onExportPDF && (
                <button
                  onClick={onExportPDF}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Export PDF
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
