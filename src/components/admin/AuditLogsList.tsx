"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AuditAction, AuditLogEntry } from "@/lib/auditLog";

// Extend the audit log entry with user email from the join
interface AuditLogWithEmail extends AuditLogEntry {
  user_email?: string;
}

interface AuditLogsListProps {
  logs: AuditLogWithEmail[];
  total: number;
  currentPage: number;
  totalPages: number;
  currentAction?: AuditAction;
  currentStartDate?: string;
  currentEndDate?: string;
  error: string | null;
}

const ACTION_OPTIONS: { value: AuditAction | ""; label: string }[] = [
  { value: "", label: "All Actions" },
  { value: "account_created", label: "Account Created" },
  { value: "account_updated", label: "Account Updated" },
  { value: "user_invited", label: "User Invited" },
  { value: "user_removed", label: "User Removed" },
  { value: "role_changed", label: "Role Changed" },
  { value: "profile_updated", label: "Profile Updated" },
  { value: "mfa_enabled", label: "MFA Enabled" },
  { value: "mfa_disabled", label: "MFA Disabled" },
  { value: "login_success", label: "Login Success" },
  { value: "login_failure", label: "Login Failure" },
  { value: "password_reset", label: "Password Reset" },
  { value: "admin_action", label: "Admin Action" },
  { value: "data_export", label: "Data Export" },
  { value: "data_access", label: "Data Access" },
];

const getActionBadgeStyle = (action: string) => {
  const styles: Record<string, string> = {
    account_created: "bg-emerald-100 text-emerald-700",
    role_changed: "bg-amber-100 text-amber-700",
    user_removed: "bg-red-100 text-red-700",
    user_invited: "bg-blue-100 text-blue-700",
    login_failure: "bg-red-100 text-red-700",
    login_success: "bg-emerald-100 text-emerald-700",
    mfa_enabled: "bg-emerald-100 text-emerald-700",
    mfa_disabled: "bg-amber-100 text-amber-700",
    admin_action: "bg-violet-100 text-violet-700",
  };
  return styles[action] || "bg-slate-100 text-slate-700";
};

const formatAction = (action: string) => {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function AuditLogsList({
  logs,
  total,
  currentPage,
  totalPages,
  currentAction,
  currentStartDate,
  currentEndDate,
  error,
}: AuditLogsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState(currentAction || "");
  const [startDate, setStartDate] = useState(currentStartDate || "");
  const [endDate, setEndDate] = useState(currentEndDate || "");

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", "1");
    startTransition(() => {
      router.push(`/dashboard/admin/audit?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setAction("");
    setStartDate("");
    setEndDate("");
    startTransition(() => {
      router.push("/dashboard/admin/audit");
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (currentAction) params.set("action", currentAction);
    if (currentStartDate) params.set("startDate", currentStartDate);
    if (currentEndDate) params.set("endDate", currentEndDate);
    params.set("page", String(page));
    startTransition(() => {
      router.push(`/dashboard/admin/audit?${params.toString()}`);
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasFilters = currentAction || currentStartDate || currentEndDate;

  // AC 1.4.6: Error state with retry, rest of admin shell remains usable
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
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
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">Failed to load audit logs</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Try Again
              </button>
              <a
                href="/dashboard/admin"
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Back to Admin
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters - AC 1.4.6: Fetch with filters (action type, date range) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Action filter */}
          <div className="min-w-[200px] flex-1">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Action Type
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as AuditAction | "")}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div className="min-w-[150px]">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* End date */}
          <div className="min-w-[150px]">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Loading..." : "Apply Filters"}
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                disabled={isPending}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                    {hasFilters
                      ? "No audit logs found matching your filters"
                      : "No audit logs yet"}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    {/* Timestamp */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {formatDate(log.created_at)}
                    </td>
                    {/* Action */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionBadgeStyle(
                          log.action
                        )}`}
                      >
                        {formatAction(log.action)}
                      </span>
                    </td>
                    {/* User */}
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {log.user_email || (
                        <span className="text-slate-400">System</span>
                      )}
                    </td>
                    {/* Entity */}
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {log.entity_type ? (
                        <span className="capitalize">{log.entity_type}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {/* Details */}
                    <td className="px-6 py-4">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <details className="cursor-pointer">
                          <summary className="text-sm text-blue-600 hover:text-blue-700">
                            View details
                          </summary>
                          <pre className="mt-2 max-w-xs overflow-x-auto rounded bg-slate-100 p-2 text-xs text-slate-600">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
            <p className="text-sm text-slate-500">
              Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isPending}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isPending}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        pageNum === currentPage
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPending}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

