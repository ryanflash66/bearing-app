"use client";

import { useState } from "react";
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
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const statusConfig = getStatusConfig(order.status);
  const metadata = order.metadata as Record<string, unknown> | null;
  const isbn = metadata?.isbn as string | undefined;
  const isPending = order.status === "pending" || order.status === "paid";
  const isInProgress = order.status === "in_progress";

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
      </div>
    </div>
  );
}
