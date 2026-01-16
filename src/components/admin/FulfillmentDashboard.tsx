"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FulfillmentQueue, { type FulfillmentRequest } from "./FulfillmentQueue";
import ISBNAssignmentModal from "./ISBNAssignmentModal";
import RejectRequestModal from "./RejectRequestModal";

interface FulfillmentDashboardProps {
  initialRequests: FulfillmentRequest[];
  availableIsbnCount: number;
}

export default function FulfillmentDashboard({
  initialRequests,
  availableIsbnCount,
}: FulfillmentDashboardProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [selectedRequest, setSelectedRequest] = useState<FulfillmentRequest | null>(null);
  const [isIsbnModalOpen, setIsIsbnModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFulfill = (request: FulfillmentRequest) => {
    setSelectedRequest(request);
    if (request.service_type === "isbn") {
      setIsIsbnModalOpen(true);
    } else {
      // For non-ISBN services, show a generic fulfill modal (future enhancement)
      // For now, just trigger the fulfillment
      handleGenericFulfill(request);
    }
  };

  const handleGenericFulfill = async (request: FulfillmentRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/fulfill-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: request.id,
          serviceType: request.service_type,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fulfill request");
      }

      // Remove from local state
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      router.refresh();
    } catch (err) {
      console.error("Error fulfilling request:", err);
      setError(err instanceof Error ? err.message : "Failed to fulfill request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = (request: FulfillmentRequest) => {
    setSelectedRequest(request);
    setIsRejectModalOpen(true);
  };

  const handleFulfillSuccess = () => {
    // Remove the fulfilled request from local state
    if (selectedRequest) {
      setRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
    }
    setSelectedRequest(null);
    router.refresh();
  };

  const handleRejectSuccess = () => {
    // Remove the rejected request from local state
    if (selectedRequest) {
      setRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
    }
    setSelectedRequest(null);
    router.refresh();
  };

  return (
    <>
      {/* Error Banner */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <FulfillmentQueue
        requests={requests}
        onFulfill={handleFulfill}
        onReject={handleReject}
        isLoading={isLoading}
      />

      {/* ISBN Assignment Modal */}
      <ISBNAssignmentModal
        isOpen={isIsbnModalOpen}
        onClose={() => {
          setIsIsbnModalOpen(false);
          setSelectedRequest(null);
        }}
        onSuccess={handleFulfillSuccess}
        request={selectedRequest}
        availableIsbnCount={availableIsbnCount}
      />

      {/* Reject Request Modal */}
      <RejectRequestModal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setSelectedRequest(null);
        }}
        onSuccess={handleRejectSuccess}
        request={selectedRequest}
      />
    </>
  );
}
