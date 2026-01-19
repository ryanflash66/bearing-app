"use client";

import { ServiceItem } from "@/lib/marketplace-data";
import { useState } from "react";
import { navigateTo } from "@/lib/navigation";

interface ServiceCardProps {
  service: ServiceItem;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPoolWarning, setShowPoolWarning] = useState(false);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);

  const isISBN = service.id === "isbn";

  const handleRequest = async () => {
    setError(null);
    setIsRequesting(true);

    try {
      if (isISBN) {
        // ISBN purchase flow via Stripe
        const response = await fetch("/api/checkout/isbn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create checkout session");
        }

        const { url, poolWarning } = await response.json();

        if (poolWarning) {
          // Show warning modal before proceeding
          setPendingCheckoutUrl(url);
          setShowPoolWarning(true);
          setIsRequesting(false);
          return;
        }

        // Redirect to Stripe Checkout
        navigateTo(url);
      } else {
        // Other services - Call the new request API
        const response = await fetch("/api/services/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId: service.id }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to submit request");
        }

        // Show success state (could be improved with a toast, but using error state for feedback for now)
        setError(null);
        alert(data.message || "Request submitted successfully!");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleConfirmPurchase = () => {
    if (pendingCheckoutUrl) {
      navigateTo(pendingCheckoutUrl);
    }
  };

  const handleCancelWarning = () => {
    setShowPoolWarning(false);
    setPendingCheckoutUrl(null);
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
            disabled={isRequesting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
          >
            {isRequesting ? "Processing..." : isISBN ? "Buy ISBN" : "Request Service"}
          </button>
        </div>
      </div>

      {/* ISBN Pool Warning Modal */}
      {showPoolWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">ISBN Pool Notice</h3>
            </div>
            <p className="mb-6 text-sm text-slate-600">
              Our pre-purchased ISBN pool is currently empty. Your ISBN will be manually assigned by our team, which may take <strong>24-48 hours</strong> after payment confirmation.
            </p>
            <p className="mb-6 text-sm text-slate-600">
              You will receive an email notification once your ISBN has been assigned.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelWarning}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
