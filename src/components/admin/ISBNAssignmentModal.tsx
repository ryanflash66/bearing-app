"use client";

import { useState } from "react";
import type { ServiceRequest } from "@/lib/marketplace-utils";

interface ISBNAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: ServiceRequest | null;
  availableIsbnCount?: number;
}

export default function ISBNAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
  request,
  availableIsbnCount = 0,
}: ISBNAssignmentModalProps) {
  const [isbn, setIsbn] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAutoAssign, setUseAutoAssign] = useState(false);

  if (!isOpen || !request) return null;

  const validateIsbn = (value: string): boolean => {
    // Remove hyphens and spaces for validation
    const cleanIsbn = value.replace(/[-\s]/g, "");
    // ISBN-13 must be 13 digits
    return /^\d{13}$/.test(cleanIsbn);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate if manual entry
    if (!useAutoAssign && !validateIsbn(isbn)) {
      setError("Invalid ISBN format. Please enter a valid 13-digit ISBN.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/fulfill-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: request.id,
          isbn: useAutoAssign ? null : isbn.replace(/[-\s]/g, ""),
          autoAssign: useAutoAssign,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fulfill request");
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoAssign = async () => {
    setUseAutoAssign(true);
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/fulfill-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: request.id,
          autoAssign: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to auto-assign ISBN");
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
      setUseAutoAssign(false);
    }
  };

  const handleClose = () => {
    setIsbn("");
    setError(null);
    setUseAutoAssign(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="isbn-modal-title"
    >
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <svg
                className="h-6 w-6 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 id="isbn-modal-title" className="text-lg font-medium leading-6 text-slate-900">
                Assign ISBN
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Enter an ISBN manually or use auto-assign from the pool.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Auto-assign option */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Auto-assign from pool
                  </p>
                  <p className="text-xs text-slate-500">
                    {availableIsbnCount > 0
                      ? `${availableIsbnCount} available in pool`
                      : "No ISBNs available in pool"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoAssign}
                  disabled={availableIsbnCount === 0 || isSubmitting}
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting && useAutoAssign ? "Assigning..." : "Auto-assign"}
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-slate-500">or enter manually</span>
              </div>
            </div>

            {/* Manual ISBN input */}
            <div>
              <label
                htmlFor="isbn"
                className="block text-sm font-medium text-slate-700"
              >
                ISBN-13
              </label>
              <input
                type="text"
                id="isbn"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="978-X-XXXXX-XXX-X"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-slate-500">
                Enter the full 13-digit ISBN with or without hyphens
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !isbn}
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:col-start-2 sm:text-sm"
              >
                {isSubmitting && !useAutoAssign ? "Assigning..." : "Assign"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
