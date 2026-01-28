"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ServiceRequest, isActiveStatus } from "@/lib/service-requests";
import { getServiceLabel, getStatusConfig } from "@/lib/marketplace-utils";

interface ServiceStatusBannerProps {
  request: ServiceRequest;
  onCancelSuccess?: () => void;
}

/**
 * Cancel confirmation modal component
 */
function CancelConfirmModal({
  isOpen,
  serviceLabel,
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  serviceLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-amber-50 px-6 py-6 border-b border-amber-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 shadow-lg shadow-amber-200">
              <svg
                className="h-6 w-6 text-white"
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
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Cancel Service Request?
              </h3>
              <p className="text-sm text-amber-600 font-medium">
                {serviceLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <p className="text-slate-600 leading-relaxed">
            Are you sure you want to cancel this <span className="font-bold text-slate-900">{serviceLabel}</span> request?
            This action cannot be undone.
          </p>

          <div className="mt-6 flex items-start gap-3 rounded-lg bg-amber-50 p-4 border border-amber-200">
            <svg className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-800 leading-tight">
              Cancelling will unlock your manuscript for editing. If you need this service later, you'll need to submit a new request.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 bg-slate-50 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
          >
            Keep Request
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="group relative flex items-center justify-center rounded-xl bg-red-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 hover:shadow-red-300 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Cancelling...
              </span>
            ) : (
              "Cancel Request"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ServiceStatusBanner - displays active service request status and lock indicator
 * AC 8.20.2: Service Status Banner
 * AC 8.20.3: Edit Locking visual indicator
 * AC 8.20.4: Cancel Request Flow
 */
export default function ServiceStatusBanner({ request, onCancelSuccess }: ServiceStatusBannerProps) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceLabel = getServiceLabel(request.service_type);
  const statusConfig = getStatusConfig(request.status);
  const isPending = request.status === "pending";
  const isActive = isActiveStatus(request.status);

  // Format date
  const createdDate = new Date(request.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Get banner color based on status
  const getBannerStyle = () => {
    switch (request.status) {
      case "pending":
        return "bg-amber-50 border-amber-200 text-amber-900";
      case "paid":
      case "in_progress":
        return "bg-blue-50 border-blue-200 text-blue-900";
      default:
        return "bg-slate-50 border-slate-200 text-slate-900";
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/service-requests/${request.id}/cancel`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel request");
      }

      setShowCancelModal(false);
      onCancelSuccess?.();

      // Refresh the page to reflect the unlocked state (server components need re-rendering)
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel request");
    } finally {
      setIsCancelling(false);
    }
  };

  // Don't render if not an active status
  if (!isActive) {
    return null;
  }

  return (
    <>
      <div className={`rounded-lg border-2 p-4 mb-4 ${getBannerStyle()}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Lock icon and info */}
          <div className="flex items-start gap-3">
            {/* Lock icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-current bg-opacity-10">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-base">
                  Editing Locked
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.className}`}>
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-sm mt-1 opacity-80">
                {serviceLabel} request is active (submitted {createdDate})
              </p>
              <p className="text-xs mt-1 opacity-60">
                Manuscript editing is disabled while this request is being processed.
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Order link */}
            <Link
              href={request.id ? `/dashboard/orders/${request.id}` : "/dashboard/orders"}
              className="rounded-lg border border-current border-opacity-30 bg-white px-4 py-2 text-sm font-medium hover:bg-opacity-90 transition-colors"
            >
              View Order
            </Link>

            {/* Cancel button (only for pending) */}
            {isPending && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
              >
                Cancel Request
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 rounded-lg bg-red-100 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      <CancelConfirmModal
        isOpen={showCancelModal}
        serviceLabel={serviceLabel}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
        isLoading={isCancelling}
      />
    </>
  );
}
