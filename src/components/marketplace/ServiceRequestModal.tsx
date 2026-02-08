"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BISAC_CODES } from "@/lib/bisac-codes";
import { isValidISBN10, isValidISBN13, cleanISBN } from "@/lib/publication-validation";
import TiptapEditor from "../editor/TiptapEditor";
import Link from "next/link";
import type { ManuscriptSummary } from "@/types/manuscript";
import { fetchManuscriptsSummary } from "@/types/manuscript";
import {
  AuthorWebsiteForm,
  MarketingForm,
  SocialMediaForm,
  GenericServiceForm,
} from "./service-forms";
import type {
  AuthorWebsiteData,
  MarketingData,
  SocialMediaData,
} from "./service-forms";

// Service types that require specific form configurations
export type ServiceType =
  | "publishing-help"
  | "isbn"
  | "author-website"
  | "marketing"
  | "social-media"
  | "cover-design"
  | "editing"
  | "printing";

// Metadata structure for publishing requests (backward compatible with PublishingRequestModal)
export interface PublishingRequestMetadata {
  isbn?: string;
  bisac_codes?: string[];
  keywords?: string[];
  acknowledgements?: any;
  education_level?: string;
}

// Generic metadata for other service types
export interface GenericServiceMetadata {
  details?: string;
  [key: string]: any;
}

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: ServiceType;
  serviceTitle: string;
  // For publishing requests (manuscript context)
  manuscriptId?: string;
  initialMetadata?: PublishingRequestMetadata;
  onMetadataSave?: (metadata: PublishingRequestMetadata) => Promise<void>;
  // Callback after successful submission
  onSuccess?: () => void;
}

// Education level options
const EDUCATION_LEVELS = [
  { value: "", label: "Select education level (optional)" },
  { value: "elementary", label: "Elementary (K-5)" },
  { value: "middle_school", label: "Middle School (6-8)" },
  { value: "high_school", label: "High School (9-12)" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "graduate", label: "Graduate" },
  { value: "professional", label: "Professional" },
  { value: "general", label: "General Audience" },
];

// Service-specific descriptions/prompts for additional details field
const SERVICE_PROMPTS: Record<string, string> = {
  "author-website":
    "Any additional details about your vision, existing branding, or special requirements?",
  marketing:
    "Any additional context about your book, audience, or marketing goals?",
  "social-media":
    "Any additional context about your book's themes, publication timeline, or specific content needs?",
  "cover-design":
    "Describe your book's genre, mood, and any visual preferences. Include any reference images or covers you admire, and key elements that should be featured.",
  editing:
    "What type of editing do you need (developmental, copy editing, or proofreading)? Include your manuscript's word count, genre, and any specific concerns.",
  printing:
    "Describe your printing needs: quantity, trim size, paper preferences, and any special requirements. Include your target timeline.",
};

export default function ServiceRequestModal({
  isOpen,
  onClose,
  serviceId,
  serviceTitle,
  manuscriptId,
  initialMetadata,
  onMetadataSave,
  onSuccess,
}: ServiceRequestModalProps) {
  const router = useRouter();
  const isPublishing = serviceId === "publishing-help";
  const isManuscriptProvided = Boolean(manuscriptId);
  const showManuscriptWarning = isPublishing && !isManuscriptProvided;
  // For non-publishing services in marketplace, we need to show manuscript dropdown
  const needsManuscriptSelection = !isPublishing && !isManuscriptProvided;

  // Manuscript state (for marketplace context where no manuscriptId provided)
  const [manuscripts, setManuscripts] = useState<ManuscriptSummary[]>([]);
  const [isLoadingManuscripts, setIsLoadingManuscripts] = useState(false);
  const [manuscriptsError, setManuscriptsError] = useState<string | null>(null);
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string>("");
  // For manuscript context - store the manuscript title for display
  const [providedManuscriptTitle, setProvidedManuscriptTitle] = useState<string | null>(null);

  // Publishing-specific state
  const [publishingData, setPublishingData] = useState<PublishingRequestMetadata>(
    initialMetadata || {}
  );
  const [bisacSearch, setBisacSearch] = useState("");
  const [isbnError, setIsbnError] = useState<string | null>(null);

  // Generic service state (for services without specific fields)
  const [details, setDetails] = useState("");

  // Service-specific state
  const [authorWebsiteData, setAuthorWebsiteData] = useState<AuthorWebsiteData>({
    designStyle: "",
    pages: [],
    budgetRange: "",
    additionalDetails: "",
  });
  const [marketingData, setMarketingData] = useState<MarketingData>({
    bookGenre: "",
    targetAudience: "",
    goals: [],
    budgetRange: "",
    platforms: [],
    additionalDetails: "",
  });
  const [socialMediaData, setSocialMediaData] = useState<SocialMediaData>({
    bookGenre: "",
    targetAudience: "",
    platforms: [],
    contentTypes: [],
    timeline: "",
    additionalDetails: "",
  });

  // Common state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateRequestId, setDuplicateRequestId] = useState<string | null>(null);

  // Effective manuscript ID: provided prop or selected from dropdown
  const effectiveManuscriptId = manuscriptId || selectedManuscriptId;
  const hasManuscript = Boolean(effectiveManuscriptId);

  // Fetch manuscripts for dropdown (marketplace context)
  const fetchManuscripts = useCallback(async () => {
    setIsLoadingManuscripts(true);
    setManuscriptsError(null);

    try {
      const data = await fetchManuscriptsSummary();
      setManuscripts(data.manuscripts);
    } catch (err) {
      console.error("Error fetching manuscripts:", err);
      setManuscriptsError(
        err instanceof Error ? err.message : "Failed to load manuscripts",
      );
    } finally {
      setIsLoadingManuscripts(false);
    }
  }, []);

  // Fetch single manuscript title by reusing the manuscripts endpoint
  const fetchManuscriptTitle = useCallback(async (id: string) => {
    try {
      const data = await fetchManuscriptsSummary();
      const manuscript = data.manuscripts.find((m) => m.id === id);
      if (manuscript) {
        setProvidedManuscriptTitle(manuscript.title);
      }
    } catch (err) {
      console.error("Error fetching manuscript title:", err);
    }
  }, []);

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isPublishing) {
        setPublishingData(initialMetadata || {});
      } else {
        setDetails("");
        // Reset service-specific states
        setAuthorWebsiteData({
          designStyle: "",
          pages: [],
          budgetRange: "",
          additionalDetails: "",
        });
        setMarketingData({
          bookGenre: "",
          targetAudience: "",
          goals: [],
          budgetRange: "",
          platforms: [],
          additionalDetails: "",
        });
        setSocialMediaData({
          bookGenre: "",
          targetAudience: "",
          platforms: [],
          contentTypes: [],
          timeline: "",
          additionalDetails: "",
        });
      }
      setError(null);
      setDuplicateRequestId(null);
      setIsbnError(null);
      setIsSubmitting(false);
      setBisacSearch("");
      setSelectedManuscriptId("");
      setManuscriptsError(null);
      setProvidedManuscriptTitle(null);

      // Fetch manuscripts if we need the dropdown
      if (needsManuscriptSelection) {
        fetchManuscripts();
      }
      // Fetch manuscript title for display in manuscript context
      if (isManuscriptProvided && manuscriptId && !isPublishing) {
        fetchManuscriptTitle(manuscriptId);
      }
    }
  }, [isOpen, initialMetadata, isPublishing, needsManuscriptSelection, fetchManuscripts, isManuscriptProvided, manuscriptId, fetchManuscriptTitle]);

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

  // Handle publishing field changes
  const handlePublishingChange = (field: keyof PublishingRequestMetadata, value: any) => {
    setPublishingData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setDuplicateRequestId(null);
  };

  // Handle ISBN changes with validation
  const handleISBNChange = (value: string) => {
    handlePublishingChange("isbn", value);
    const cleaned = cleanISBN(value);

    if (cleaned && cleaned.length > 0) {
      if (cleaned.length === 10) {
        if (!isValidISBN10(cleaned)) {
          setIsbnError("Invalid ISBN-10 checksum or format");
        } else {
          setIsbnError(null);
        }
      } else if (cleaned.length === 13) {
        if (!isValidISBN13(cleaned)) {
          setIsbnError("Invalid ISBN-13 checksum or format");
        } else {
          setIsbnError(null);
        }
      } else if (cleaned.length > 13) {
        setIsbnError("ISBN must be 10 or 13 digits");
      } else {
        setIsbnError(null);
      }
    } else {
      setIsbnError(null);
    }
  };

  // Handle keyword addition
  const handleAddKeyword = (keyword: string) => {
    const trimmed = keyword.trim();
    if (trimmed && !publishingData.keywords?.includes(trimmed)) {
      handlePublishingChange("keywords", [...(publishingData.keywords || []), trimmed]);
    }
  };

  // Handle keyword removal
  const handleRemoveKeyword = (index: number) => {
    handlePublishingChange(
      "keywords",
      publishingData.keywords?.filter((_, i) => i !== index)
    );
  };

  // Validation logic for publishing form
  const isPublishingFormValid = useMemo(() => {
    if (!isPublishing) return true;

    // Category is required (at least one BISAC code)
    if (!publishingData.bisac_codes || publishingData.bisac_codes.length === 0) {
      return false;
    }

    // At least one keyword is required
    if (!publishingData.keywords || publishingData.keywords.length === 0) {
      return false;
    }

    // If ISBN is present, it must be valid
    if (publishingData.isbn) {
      const cleaned = cleanISBN(publishingData.isbn);
      if (cleaned) {
        if (cleaned.length === 10 && !isValidISBN10(cleaned)) {
          return false;
        }
        if (cleaned.length === 13 && !isValidISBN13(cleaned)) {
          return false;
        }
        if (cleaned.length !== 10 && cleaned.length !== 13) {
          return false;
        }
      }
    }

    return true;
  }, [publishingData, isPublishing]);

  // Service-specific form validation
  const isAuthorWebsiteValid = useMemo(() => {
    if (serviceId !== "author-website") return true;
    // Require at least a design style selection
    return authorWebsiteData.designStyle !== "";
  }, [serviceId, authorWebsiteData.designStyle]);

  const isMarketingValid = useMemo(() => {
    if (serviceId !== "marketing") return true;
    // Require at least one marketing goal
    return marketingData.goals.length > 0;
  }, [serviceId, marketingData.goals]);

  const isSocialMediaValid = useMemo(() => {
    if (serviceId !== "social-media") return true;
    // Require at least one platform
    return socialMediaData.platforms.length > 0;
  }, [serviceId, socialMediaData.platforms]);

  // Combined form validation
  const isFormValid = useMemo(() => {
    // Manuscript is required for all services
    if (!hasManuscript) return false;

    // Service-specific validation
    if (isPublishing) return isPublishingFormValid;
    if (serviceId === "author-website") return isAuthorWebsiteValid;
    if (serviceId === "marketing") return isMarketingValid;
    if (serviceId === "social-media") return isSocialMediaValid;

    // Generic services (cover-design, editing, printing) - just need manuscript
    return true;
  }, [hasManuscript, isPublishing, isPublishingFormValid, serviceId, isAuthorWebsiteValid, isMarketingValid, isSocialMediaValid]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setDuplicateRequestId(null);

    try {
      // For publishing requests, save manuscript metadata first
      if (isPublishing && onMetadataSave) {
        const metadataToSave: PublishingRequestMetadata = {};
        if (publishingData.acknowledgements !== undefined) {
          metadataToSave.acknowledgements = publishingData.acknowledgements;
        }
        if (publishingData.education_level !== undefined) {
          metadataToSave.education_level = publishingData.education_level;
        }
        if (publishingData.bisac_codes) {
          metadataToSave.bisac_codes = publishingData.bisac_codes;
        }
        if (publishingData.keywords) {
          metadataToSave.keywords = publishingData.keywords;
        }

        await onMetadataSave(metadataToSave);
      }

      // Build metadata for the request based on service type
      let metadata: Record<string, unknown>;

      if (isPublishing) {
        metadata = {
          isbn: publishingData.isbn ? cleanISBN(publishingData.isbn) : undefined,
          bisac_codes: publishingData.bisac_codes,
          keywords: publishingData.keywords,
          education_level: publishingData.education_level,
        };
      } else if (serviceId === "author-website") {
        metadata = {
          design_style: authorWebsiteData.designStyle || undefined,
          pages: authorWebsiteData.pages.length > 0 ? authorWebsiteData.pages : undefined,
          budget_range: authorWebsiteData.budgetRange || undefined,
          details: authorWebsiteData.additionalDetails.trim() || undefined,
        };
      } else if (serviceId === "marketing") {
        metadata = {
          book_genre: marketingData.bookGenre.trim() || undefined,
          target_audience: marketingData.targetAudience.trim() || undefined,
          goals: marketingData.goals.length > 0 ? marketingData.goals : undefined,
          budget_range: marketingData.budgetRange || undefined,
          platforms: marketingData.platforms.length > 0 ? marketingData.platforms : undefined,
          details: marketingData.additionalDetails.trim() || undefined,
        };
      } else if (serviceId === "social-media") {
        metadata = {
          book_genre: socialMediaData.bookGenre.trim() || undefined,
          target_audience: socialMediaData.targetAudience.trim() || undefined,
          platforms: socialMediaData.platforms.length > 0 ? socialMediaData.platforms : undefined,
          content_types: socialMediaData.contentTypes.length > 0 ? socialMediaData.contentTypes : undefined,
          timeline: socialMediaData.timeline.trim() || undefined,
          details: socialMediaData.additionalDetails.trim() || undefined,
        };
      } else {
        // Generic services (cover-design, editing, printing)
        metadata = {
          details: details.trim() || undefined,
        };
      }

      // Create the service request
      const response = await fetch("/api/services/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          manuscriptId: effectiveManuscriptId || undefined,
          metadata,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle duplicate active request (409)
        if (response.status === 409 && data.code === "DUPLICATE_ACTIVE_REQUEST") {
          setError("This manuscript already has an active service request.");
          setDuplicateRequestId(data.existingRequestId || null);
          return;
        }

        throw new Error(data.error || "Failed to submit request");
      }

      // Success - close modal and notify
      onClose();
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Service request error:", err);
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const prompt = SERVICE_PROMPTS[serviceId] || "Please describe what you need help with.";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
      <div className="w-full h-full md:max-w-2xl md:h-[85vh] flex flex-col rounded-xl md:rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900">
              Request {serviceTitle}
            </h3>
            <p className="text-xs md:text-sm text-slate-500 hidden sm:block">
              Submit your request for {serviceTitle.toLowerCase()}
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
          {/* Publishing requests require a manuscript context */}
          {showManuscriptWarning && (
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
                    Publishing requests must be created from a manuscript.
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Open a manuscript and click{" "}
                    <span className="font-semibold">Publishing</span> to
                    continue.
                  </p>
                  <Link
                    href="/dashboard/manuscripts"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-amber-800 underline hover:text-amber-900"
                  >
                    Go to Manuscripts
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
          {/* Warning text for publishing */}
          {isPublishing && (
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
                <p className="text-sm text-amber-800 font-medium">
                  Before you publish this book, your manuscript will be sent to
                  NGANDIWEB for publishing. You cannot edit this manuscript while
                  the request is active.
                </p>
              </div>
            </div>
          )}

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
                      View existing request
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
                  {error && !duplicateRequestId && (
                    <Link
                      href="/dashboard/orders"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-red-700 underline hover:text-red-900"
                    >
                      Go to My Orders
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manuscripts loading error */}
          {manuscriptsError && needsManuscriptSelection && (
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
                  <p className="text-sm text-red-800 font-medium">
                    Failed to load manuscripts
                  </p>
                  <p className="mt-1 text-xs text-red-700">
                    {manuscriptsError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state for no manuscripts */}
          {needsManuscriptSelection && !isLoadingManuscripts && manuscripts.length === 0 && !manuscriptsError && (
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
                    You need at least one manuscript to request this service.
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
          <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <input type="hidden" name="service_type" value={serviceId} readOnly />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service Type
              </p>
              <p className="text-sm font-medium text-slate-900">{serviceTitle}</p>
            </div>

            {/* Manuscript selection (marketplace context) */}
            {needsManuscriptSelection && (
              <div>
                <label
                  htmlFor="manuscript"
                  className="block text-sm font-medium text-slate-700"
                >
                  Manuscript <span className="text-red-500">*</span>
                </label>
                <select
                  id="manuscript"
                  value={selectedManuscriptId}
                  onChange={(e) => {
                    setSelectedManuscriptId(e.target.value);
                    setError(null);
                    setDuplicateRequestId(null);
                  }}
                  disabled={isLoadingManuscripts}
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-slate-100"
                >
                  <option value="">
                    {isLoadingManuscripts
                      ? "Loading manuscripts..."
                      : "Select a manuscript"}
                  </option>
                  {manuscripts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Select the manuscript this service request applies to.
                </p>
              </div>
            )}

            {/* Manuscript display (manuscript context - read only) */}
            {isManuscriptProvided && !isPublishing && (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Manuscript
                </label>
                <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">
                    {providedManuscriptTitle || "Loading..."}
                  </p>
                </div>
              </div>
            )}

            {isPublishing ? (
              // Publishing-specific form
              <>
                {/* ISBN - optional */}
                <div>
                  <label
                    htmlFor="isbn"
                    className="block text-sm font-medium text-slate-700"
                  >
                    ISBN <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="isbn"
                    type="text"
                    value={publishingData.isbn || ""}
                    onChange={(e) => handleISBNChange(e.target.value)}
                    placeholder="978-0-00-000000-0 or 0-00-000000-0"
                    className={`mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                      isbnError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                  />
                  {isbnError && (
                    <p className="mt-1 text-xs text-red-600">{isbnError}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Supports ISBN-10 and ISBN-13 formats
                  </p>
                </div>

                {/* Category (BISAC) - required */}
                <div>
                  <label
                    htmlFor="bisac_codes"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={bisacSearch}
                    onChange={(e) => setBisacSearch(e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <select
                    id="bisac_codes"
                    multiple
                    value={publishingData.bisac_codes || []}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      handlePublishingChange("bisac_codes", selected);
                    }}
                    className="mt-2 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-32"
                  >
                    {filteredBisac.map((bisac) => (
                      <option key={bisac.code} value={bisac.code}>
                        {bisac.code} - {bisac.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Hold Ctrl/Cmd to select multiple. At least one category
                    required.
                  </p>
                  {publishingData.bisac_codes && publishingData.bisac_codes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {publishingData.bisac_codes.map((code) => {
                        const bisac = BISAC_CODES.find((b) => b.code === code);
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium"
                          >
                            {code}
                            <button
                              type="button"
                              onClick={() =>
                                handlePublishingChange(
                                  "bisac_codes",
                                  publishingData.bisac_codes?.filter((c) => c !== code)
                                )
                              }
                              className="hover:text-indigo-900"
                            >
                              &times;
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Keywords - required */}
                <div>
                  <label
                    htmlFor="keywords"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Keywords <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex flex-wrap gap-2 p-2 border border-slate-300 rounded-md bg-white min-h-[42px]">
                    {publishingData.keywords?.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(i)}
                          className="hover:text-indigo-900"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <input
                      id="keywords"
                      type="text"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddKeyword(e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                      placeholder="Type keyword and press Enter..."
                      className="flex-1 min-w-[150px] border-none focus:ring-0 sm:text-sm p-0"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Press Enter or comma to add. At least one keyword required.
                  </p>
                </div>

                {/* Acknowledgements - optional */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Acknowledgements{" "}
                    <span className="text-slate-400">(optional)</span>
                  </label>
                  <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                    <TiptapEditor
                      content={
                        publishingData.acknowledgements || { type: "doc", content: [] }
                      }
                      onUpdate={({ json }) => handlePublishingChange("acknowledgements", json)}
                      placeholder="I would like to thank..."
                      className="min-h-[100px] p-3"
                    />
                  </div>
                </div>

                {/* Education level - optional */}
                <div>
                  <label
                    htmlFor="education_level"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Education Level{" "}
                    <span className="text-slate-400">(optional)</span>
                  </label>
                  <select
                    id="education_level"
                    value={publishingData.education_level || ""}
                    onChange={(e) => handlePublishingChange("education_level", e.target.value)}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {EDUCATION_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : serviceId === "author-website" ? (
              <AuthorWebsiteForm
                data={authorWebsiteData}
                onChange={setAuthorWebsiteData}
                prompt={prompt}
              />
            ) : serviceId === "marketing" ? (
              <MarketingForm
                data={marketingData}
                onChange={setMarketingData}
                prompt={prompt}
              />
            ) : serviceId === "social-media" ? (
              <SocialMediaForm
                data={socialMediaData}
                onChange={setSocialMediaData}
                prompt={prompt}
              />
            ) : (
              <GenericServiceForm
                details={details}
                onChange={(val) => {
                  setDetails(val);
                  setError(null);
                }}
                prompt={prompt}
              />
            )}
          </div>
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
            disabled={!isFormValid || isSubmitting}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center gap-2"
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
                Sending...
              </>
            ) : (
              <>
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
                Submit Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
