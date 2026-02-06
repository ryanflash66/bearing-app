"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ServiceRequest,
  formatCents,
  getServiceLabel,
  getStatusConfig,
  getEstimatedTime,
} from "@/lib/marketplace-utils";

interface OrderDetailProps {
  order: ServiceRequest;
}

export default function OrderDetail({ order }: OrderDetailProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const statusConfig = getStatusConfig(order.status);
  const metadata = order.metadata as Record<string, unknown> | null;
  const isbn = metadata?.isbn as string | undefined;
  const bisacCodes = metadata?.bisac_codes as string[] | undefined;
  const keywords = metadata?.keywords as string[] | undefined;
  const educationLevel = metadata?.education_level as string | undefined;
  const adminNotes = metadata?.admin_notes as string | undefined;
  const metadataKeysToExclude = new Set(["admin_notes"]);

  if (order.service_type === "publishing_help") {
    metadataKeysToExclude.add("isbn");
    metadataKeysToExclude.add("bisac_codes");
    metadataKeysToExclude.add("keywords");
    metadataKeysToExclude.add("education_level");
  }

  if (order.service_type === "isbn" && order.status === "completed" && isbn) {
    metadataKeysToExclude.add("isbn");
  }

  const metadataEntries = metadata
    ? Object.entries(metadata).filter(([key]) => !metadataKeysToExclude.has(key))
    : [];
  const hasMetadata = metadataEntries.length > 0;
  const canCancel = order.status === "pending"; // AC 8.13.3: Only pending orders can be cancelled
  const isPending = order.status === "pending" || order.status === "paid";
  const isInProgress = order.status === "in_progress";

  const formatMetadataKey = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatMetadataValue = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "—";
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const handleCopyIsbn = async () => {
    if (isbn) {
      try {
        await navigator.clipboard.writeText(isbn);
        setCopied(true);
        setCopyError(false);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopyError(true);
        setTimeout(() => setCopyError(false), 3000);
      }
    }
  };

  // AC 8.13.3: Cancel Request handler
  const handleCancelRequest = async () => {
    if (!canCancel || cancelling) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this request? This action cannot be undone."
    );
    if (!confirmed) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const response = await fetch(`/api/service-requests/${order.id}/cancel`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel request");
      }

      // Refresh the page to show updated status
      router.refresh();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel request");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {getServiceLabel(order.service_type)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Order placed on {format(new Date(order.created_at), "MMM d, yyyy")}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5 space-y-6">
        {/* Processing indicator for pending orders */}
        {isPending && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-amber-800">Processing</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Your order is being processed. Estimated completion: {getEstimatedTime(order.service_type)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* In progress indicator */}
        {isInProgress && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-800">In Progress</h3>
                <p className="mt-1 text-sm text-blue-700">
                  Our team is actively working on your order.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ISBN display for completed ISBN orders */}
        {order.service_type === "isbn" && order.status === "completed" && isbn && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">Your ISBN</h3>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-2 bg-white border border-green-200 rounded-md font-mono text-lg text-slate-900">
                {isbn}
              </code>
              <button
                onClick={handleCopyIsbn}
                className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                aria-label="Copy ISBN"
              >
                {copyError ? (
                  <>
                    <svg className="h-4 w-4 mr-1.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-600">Failed</span>
                  </>
                ) : copied ? (
                  <>
                    <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            {copyError && (
              <p className="mt-2 text-xs text-red-600">
                Could not copy to clipboard. Please select and copy manually.
              </p>
            )}
          </div>
        )}

        {/* Publishing request metadata display (AC 8.6.6) */}
        {order.service_type === "publishing_help" && metadata && (
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Publishing Request Details
            </h3>

            {/* ISBN if provided */}
            {isbn && (
              <div>
                <dt className="text-xs font-medium text-indigo-700 uppercase tracking-wide">ISBN</dt>
                <dd className="mt-1 text-sm text-slate-900 font-mono">{isbn}</dd>
              </div>
            )}

            {/* Categories */}
            {bisacCodes && bisacCodes.length > 0 && (
              <div>
                <dt className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Categories</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {bisacCodes.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-medium"
                    >
                      {code}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {/* Keywords */}
            {keywords && keywords.length > 0 && (
              <div>
                <dt className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Keywords</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {/* Education Level */}
            {educationLevel && (
              <div>
                <dt className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Education Level</dt>
                <dd className="mt-1 text-sm text-slate-900 capitalize">
                  {educationLevel.replace(/_/g, " ")}
                </dd>
              </div>
            )}
          </div>
        )}

        {/* AC 8.13.3: Full Metadata (submitted form data, etc.) */}
        {hasMetadata && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Request Details</h3>
            <dl className="space-y-2">
              {metadataEntries.map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                  <dt className="text-xs font-medium text-slate-500 sm:w-48">
                    {formatMetadataKey(key)}
                  </dt>
                  <dd className="text-sm text-slate-900 whitespace-pre-wrap">
                    {formatMetadataValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Order details */}
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-sm font-medium text-slate-500">Service</dt>
            <dd className="mt-1 text-sm text-slate-900">{getServiceLabel(order.service_type)}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-sm font-medium text-slate-500">Amount Paid</dt>
            <dd className="mt-1 text-sm text-slate-900">{formatCents(order.amount_cents)}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-sm font-medium text-slate-500">Order Date</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {format(new Date(order.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </dd>
          </div>
          {order.updated_at && (
            <div className="rounded-lg bg-slate-50 p-4">
              <dt className="text-sm font-medium text-slate-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {format(new Date(order.updated_at), "MMMM d, yyyy 'at' h:mm a")}
              </dd>
            </div>
          )}
        </dl>

        {/* AC 8.13.3: Admin Notes (if visible to user) */}
        {adminNotes && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Admin Notes
            </h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{adminNotes}</p>
          </div>
        )}

        {/* AC 8.13.3: Cancel Request button (only for pending orders) */}
        {canCancel && (
          <div className="pt-4 border-t border-slate-200">
            {cancelError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{cancelError}</p>
              </div>
            )}
            <button
              onClick={handleCancelRequest}
              disabled={cancelling}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cancelling...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Request
                </>
              )}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              You can only cancel pending requests. Once processing begins, cancellation is no longer available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
