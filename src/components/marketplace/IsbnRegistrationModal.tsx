"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { BISAC_CODES } from "@/lib/bisac-codes";
import { navigateTo } from "@/lib/navigation";
import Link from "next/link";

interface Manuscript {
  id: string;
  title: string;
  metadata?: {
    author_name?: string;
    bisac_codes?: string[];
    [key: string]: unknown;
  };
}

interface IsbnRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If provided, manuscript is pre-selected and read-only
  manuscriptId?: string;
  // User's display name for fallback
  userDisplayName?: string;
}

interface IsbnFormData {
  manuscriptId: string;
  authorName: string;
  bisacCode: string;
}

export default function IsbnRegistrationModal({
  isOpen,
  onClose,
  manuscriptId: initialManuscriptId,
  userDisplayName,
}: IsbnRegistrationModalProps) {
  // Manuscript state
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [isLoadingManuscripts, setIsLoadingManuscripts] = useState(false);
  const [manuscriptsError, setManuscriptsError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<IsbnFormData>({
    manuscriptId: initialManuscriptId || "",
    authorName: "",
    bisacCode: "",
  });
  const [bisacSearch, setBisacSearch] = useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateRequestId, setDuplicateRequestId] = useState<string | null>(null);

  // Pool warning state
  const [showPoolWarning, setShowPoolWarning] = useState(false);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);

  const isManuscriptProvided = Boolean(initialManuscriptId);
  const supabase = createClient();

  // Fetch manuscripts when modal opens (marketplace context only)
  useEffect(() => {
    if (!isOpen) return;

    // Reset state when opening
    setError(null);
    setDuplicateRequestId(null);
    setBisacSearch("");
    setShowPoolWarning(false);
    setPendingCheckoutUrl(null);

    if (isManuscriptProvided) {
      // If manuscript ID provided, fetch just that manuscript for metadata prefill
      fetchSingleManuscript(initialManuscriptId!);
    } else {
      // Fetch all manuscripts for the dropdown
      fetchManuscripts();
    }
  }, [isOpen, initialManuscriptId, isManuscriptProvided]);

  // Prefill form when selected manuscript changes
  useEffect(() => {
    if (formData.manuscriptId) {
      const selectedManuscript = manuscripts.find(m => m.id === formData.manuscriptId);
      if (selectedManuscript) {
        prefillFromManuscript(selectedManuscript);
      }
    }
  }, [formData.manuscriptId, manuscripts]);

  async function fetchManuscripts() {
    setIsLoadingManuscripts(true);
    setManuscriptsError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setManuscriptsError("Please sign in to continue");
        return;
      }

      // Get user's account
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!profile) {
        setManuscriptsError("Could not find your account");
        return;
      }

      // Get account membership
      const { data: membership } = await supabase
        .from("account_members")
        .select("account_id")
        .eq("user_id", profile.id)
        .single();

      if (!membership) {
        setManuscriptsError("Could not find your account");
        return;
      }

      // Get manuscripts for the account
      const { data, error } = await supabase
        .from("manuscripts")
        .select("id, title, metadata")
        .eq("account_id", membership.account_id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching manuscripts:", error);
        setManuscriptsError("Failed to load manuscripts");
        return;
      }

      setManuscripts(data || []);
    } catch (err) {
      console.error("Error fetching manuscripts:", err);
      setManuscriptsError("Failed to load manuscripts");
    } finally {
      setIsLoadingManuscripts(false);
    }
  }

  async function fetchSingleManuscript(manuscriptId: string) {
    setIsLoadingManuscripts(true);
    setManuscriptsError(null);

    try {
      const { data, error } = await supabase
        .from("manuscripts")
        .select("id, title, metadata")
        .eq("id", manuscriptId)
        .single();

      if (error) {
        console.error("Error fetching manuscript:", error);
        setManuscriptsError("Failed to load manuscript");
        return;
      }

      if (data) {
        setManuscripts([data]);
        setFormData(prev => ({ ...prev, manuscriptId: data.id }));
        prefillFromManuscript(data);
      }
    } catch (err) {
      console.error("Error fetching manuscript:", err);
      setManuscriptsError("Failed to load manuscript");
    } finally {
      setIsLoadingManuscripts(false);
    }
  }

  function prefillFromManuscript(manuscript: Manuscript) {
    const metadata = manuscript.metadata;

    // Prefill author name: manuscript metadata > user display name > empty
    const authorName = metadata?.author_name?.trim() || userDisplayName || "";

    // Prefill BISAC code: first code from manuscript metadata or empty
    const bisacCode = metadata?.bisac_codes?.[0] || "";

    setFormData(prev => ({
      ...prev,
      authorName,
      bisacCode,
    }));
  }

  // Filter BISAC codes based on search
  const filteredBisac = useMemo(() => {
    if (!bisacSearch.trim()) return BISAC_CODES;
    const search = bisacSearch.toLowerCase();
    return BISAC_CODES.filter(
      (b) =>
        b.code.toLowerCase().includes(search) ||
        b.label.toLowerCase().includes(search)
    );
  }, [bisacSearch]);

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      formData.manuscriptId.trim() !== "" &&
      formData.authorName.trim() !== "" &&
      formData.bisacCode.trim() !== ""
    );
  }, [formData]);

  // Handle form field changes
  function handleChange(field: keyof IsbnFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setDuplicateRequestId(null);
  }

  // Handle manuscript selection change
  function handleManuscriptChange(manuscriptId: string) {
    handleChange("manuscriptId", manuscriptId);
  }

  // Handle form submission
  async function handleSubmit() {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setDuplicateRequestId(null);

    try {
      const response = await fetch("/api/checkout/isbn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manuscriptId: formData.manuscriptId,
          metadata: {
            author_name: formData.authorName.trim(),
            bisac_code: formData.bisacCode,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle duplicate active request (409)
        if (response.status === 409 && data.code === "DUPLICATE_ACTIVE_REQUEST") {
          setError("This manuscript already has an active ISBN request.");
          setDuplicateRequestId(data.existingRequestId || null);
          return;
        }

        throw new Error(data.error || "Failed to create checkout session");
      }

      const { url, poolWarning } = data;

      if (poolWarning) {
        // Show warning modal before proceeding
        setPendingCheckoutUrl(url);
        setShowPoolWarning(true);
        return;
      }

      // Redirect to Stripe Checkout
      navigateTo(url);
    } catch (err) {
      console.error("ISBN checkout error:", err);
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleConfirmPurchase() {
    if (pendingCheckoutUrl) {
      navigateTo(pendingCheckoutUrl);
    }
  }

  function handleCancelWarning() {
    setShowPoolWarning(false);
    setPendingCheckoutUrl(null);
  }

  if (!isOpen) return null;

  const selectedManuscript = manuscripts.find(m => m.id === formData.manuscriptId);
  const hasNoManuscripts = !isLoadingManuscripts && manuscripts.length === 0;

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-lg flex flex-col rounded-xl md:rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-slate-900">
                ISBN Registration
              </h3>
              <p className="text-xs md:text-sm text-slate-500 hidden sm:block">
                Get an official ISBN for your book
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
            >
              Close
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 space-y-6">
            {/* Error display */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                    {duplicateRequestId && (
                      <Link
                        href={`/dashboard/orders/${duplicateRequestId}`}
                        className="mt-2 inline-flex items-center gap-1 text-sm text-red-700 underline hover:text-red-900"
                      >
                        View existing order
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </Link>
                    )}
                    {!duplicateRequestId && (
                      <Link
                        href="/dashboard/orders"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-red-700 underline hover:text-red-900"
                      >
                        View My Orders
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Empty state for no manuscripts */}
            {hasNoManuscripts && !isManuscriptProvided && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-amber-500"
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
                    <p className="text-sm text-amber-800 font-medium">
                      No manuscripts found
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      You need at least one manuscript to register an ISBN.
                    </p>
                    <Link
                      href="/dashboard/manuscripts/new"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-amber-800 underline hover:text-amber-900"
                    >
                      Create a manuscript
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Form fields */}
            {(!hasNoManuscripts || isManuscriptProvided) && (
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                {/* Manuscript selection */}
                <div>
                  <label
                    htmlFor="manuscript"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Manuscript <span className="text-red-500">*</span>
                  </label>
                  {isManuscriptProvided ? (
                    // Read-only display
                    <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-sm font-medium text-slate-900">
                        {selectedManuscript?.title || "Loading..."}
                      </p>
                    </div>
                  ) : (
                    // Dropdown selection
                    <select
                      id="manuscript"
                      value={formData.manuscriptId}
                      onChange={(e) => handleManuscriptChange(e.target.value)}
                      disabled={isLoadingManuscripts}
                      className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-slate-100"
                    >
                      <option value="">
                        {isLoadingManuscripts ? "Loading manuscripts..." : "Select a manuscript"}
                      </option>
                      {manuscripts.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Author Name */}
                <div>
                  <label
                    htmlFor="authorName"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Author Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="authorName"
                    type="text"
                    value={formData.authorName}
                    onChange={(e) => handleChange("authorName", e.target.value)}
                    placeholder="Enter the author name for ISBN registration"
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    This name will appear in ISBN databases and book listings.
                  </p>
                </div>

                {/* Category (BISAC) */}
                <div>
                  <label
                    htmlFor="bisacCode"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={bisacSearch}
                    onChange={(e) => setBisacSearch(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <select
                    id="bisacCode"
                    value={formData.bisacCode}
                    onChange={(e) => handleChange("bisacCode", e.target.value)}
                    className="mt-2 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select a category</option>
                    {filteredBisac.map((bisac) => (
                      <option key={bisac.code} value={bisac.code}>
                        {bisac.code} - {bisac.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    BISAC subject code for book classification.
                  </p>
                </div>

                {/* Price info */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-blue-800">
                      ISBN Registration: <strong>$125</strong> • Turnaround: 24-48 hours
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with CTA */}
          <div className="border-t border-slate-200 bg-white px-4 md:px-6 py-3 md:py-4 flex justify-end gap-2 md:gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting || hasNoManuscripts}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
                  Processing...
                </>
              ) : (
                "Buy ISBN"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ISBN Pool Warning Modal */}
      {showPoolWarning && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50">
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
