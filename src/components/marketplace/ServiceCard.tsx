"use client";

import { ServiceItem } from "@/lib/marketplace-data";
import { useEffect, useState } from "react";
import { navigateTo } from "@/lib/navigation";
import ServiceRequestModal, { ServiceType } from "./ServiceRequestModal";
import IsbnRegistrationModal from "./IsbnRegistrationModal";

interface ServiceCardProps {
  service: ServiceItem;
  manuscriptId?: string;
  userDisplayName?: string;
}

export default function ServiceCard({ service, manuscriptId, userDisplayName }: ServiceCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showIsbnModal, setShowIsbnModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isISBN = service.id === "isbn";
  const isPublishingHelp = service.id === "publishing-help";

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const handleRequest = () => {
    setError(null);

    if (isISBN) {
      // ISBN purchase flow - open modal to collect details before Stripe checkout
      setShowIsbnModal(true);
    } else if (isPublishingHelp) {
      // Publishing assistance requires selecting a manuscript first
      navigateTo("/dashboard/manuscripts");
    } else {
      // Other services - Open the ServiceRequestModal
      setShowModal(true);
    }
  };

  const handleModalSuccess = () => {
    // Show success feedback
    setError(null);
    if (!manuscriptId) {
      setToastMessage(`${service.title} request submitted successfully.`);
    }
    // If we are in manuscript context, reload to show lock state
    if (manuscriptId) {
      window.location.reload();
    }
  };

  return (
    <>
      <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
        <div>
          <h3 className="mb-2 text-lg font-bold text-slate-900">{service.title}</h3>
          <p className="mb-4 text-sm text-slate-600 leading-relaxed">
            {service.description}
          </p>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Turnaround: <span className="font-medium text-slate-700">{service.turnaroundTime}</span></span>
            </div>
            <button
              disabled
              className="text-slate-400 cursor-not-allowed"
              aria-label="Track order feature coming soon"
            >
              Track Order
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={handleRequest}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isISBN ? "Buy ISBN" : "Request Service"}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className="fixed bottom-4 right-4 z-[120] rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}

      {/* Service Request Modal (for non-ISBN services) */}
      <ServiceRequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        serviceId={service.id as ServiceType}
        serviceTitle={service.title}
        manuscriptId={manuscriptId}
        onSuccess={handleModalSuccess}
      />

      {/* ISBN Registration Modal */}
      <IsbnRegistrationModal
        isOpen={showIsbnModal}
        onClose={() => setShowIsbnModal(false)}
        manuscriptId={manuscriptId}
        userDisplayName={userDisplayName}
      />
    </>
  );
}
