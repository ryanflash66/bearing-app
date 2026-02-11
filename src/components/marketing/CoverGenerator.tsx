"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  COVER_POLL_MAX_ATTEMPTS,
  getCoverPollDelaySeconds,
} from "@/lib/covers/polling";

type CoverStyle = "Cinematic" | "Illustrated" | "Minimalist";
type JobStatus = "queued" | "running" | "completed" | "failed";
type OverlayFont = "serif" | "sans-serif" | "monospace";
type OverlayPosition = "top" | "center" | "bottom";

interface CoverImage {
  url?: string;
  safety_status?: string;
  seed?: number;
  [key: string]: unknown;
}

interface CoverJobResponse {
  job_id: string;
  status: JobStatus;
  images: CoverImage[];
  completed_images: CoverImage[];
  retry_after?: string | null;
  error_message?: string | null;
  selected_url?: string | null;
}

interface OverlayConfig {
  fontFamily: OverlayFont;
  position: OverlayPosition;
  color: string;
  opacity: number;
}

interface CoverGeneratorProps {
  manuscriptId: string;
  manuscriptTitle: string;
  authorName?: string;
  currentCoverUrl?: string | null;
  manuscriptMetadata?: Record<string, unknown> | null;
}

const GENRE_OPTIONS = [
  "Fantasy",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "Mystery",
  "Historical",
  "Literary",
  "Young Adult",
];

const MOOD_OPTIONS = [
  "Epic",
  "Moody",
  "Optimistic",
  "Dark",
  "Whimsical",
  "Elegant",
  "Gritty",
  "Dreamlike",
];

const STYLE_OPTIONS: CoverStyle[] = ["Cinematic", "Illustrated", "Minimalist"];

const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  fontFamily: "serif",
  position: "bottom",
  color: "#FFFFFF",
  opacity: 0.88,
};

function getOverlayPositionClass(position: OverlayPosition): string {
  if (position === "top") return "top-4";
  if (position === "center") return "top-1/2 -translate-y-1/2";
  return "bottom-4";
}

function getOverlayFontClass(font: OverlayFont): string {
  if (font === "sans-serif") return "font-sans";
  if (font === "monospace") return "font-mono";
  return "font-serif";
}

function getColorWithOpacity(hexColor: string, opacity: number): string {
  const safeHex = /^#[0-9A-Fa-f]{6}$/.test(hexColor) ? hexColor.slice(1) : "FFFFFF";
  const alpha = Math.round(Math.min(Math.max(opacity, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${safeHex}${alpha}`;
}

function parseCoverOverlayConfig(
  metadata: Record<string, unknown> | null | undefined
): OverlayConfig {
  if (!metadata || typeof metadata !== "object") return DEFAULT_OVERLAY_CONFIG;

  const raw = metadata.cover_overlay_config;
  if (!raw || typeof raw !== "object") return DEFAULT_OVERLAY_CONFIG;

  const config = raw as Partial<OverlayConfig>;
  const fontFamily: OverlayFont =
    config.fontFamily === "sans-serif" || config.fontFamily === "monospace" || config.fontFamily === "serif"
      ? config.fontFamily
      : DEFAULT_OVERLAY_CONFIG.fontFamily;
  const position: OverlayPosition =
    config.position === "top" || config.position === "center" || config.position === "bottom"
      ? config.position
      : DEFAULT_OVERLAY_CONFIG.position;
  const color = typeof config.color === "string" ? config.color : DEFAULT_OVERLAY_CONFIG.color;
  const opacity =
    typeof config.opacity === "number" && Number.isFinite(config.opacity)
      ? Math.min(Math.max(config.opacity, 0.1), 1)
      : DEFAULT_OVERLAY_CONFIG.opacity;

  return {
    fontFamily,
    position,
    color,
    opacity,
  };
}

export default function CoverGenerator({
  manuscriptId,
  manuscriptTitle,
  authorName,
  currentCoverUrl,
  manuscriptMetadata,
}: CoverGeneratorProps) {
  const supabase = createClient();
  const initialOverlayConfig = useMemo(
    () => parseCoverOverlayConfig(manuscriptMetadata),
    [manuscriptMetadata]
  );

  const [genre, setGenre] = useState(GENRE_OPTIONS[0]);
  const [mood, setMood] = useState(MOOD_OPTIONS[0]);
  const [style, setStyle] = useState<CoverStyle>("Cinematic");
  const [description, setDescription] = useState("");
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>(initialOverlayConfig);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [displayJobId, setDisplayJobId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [images, setImages] = useState<CoverImage[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [pendingSelectionUrl, setPendingSelectionUrl] = useState<string | null>(null);
  const [savingOverlay, setSavingOverlay] = useState(false);
  const [actioningImageUrl, setActioningImageUrl] = useState<string | null>(null);
  const [appliedCoverUrl, setAppliedCoverUrl] = useState<string | null>(currentCoverUrl ?? null);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPreviewImage = previewIndex !== null ? images[previewIndex] : null;
  const isActiveJob = isGenerating || activeJobId !== null;
  const completedCount = images.filter((image) => typeof image?.url === "string").length;

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveJob() {
      const { data, error } = await supabase
        .from("cover_jobs")
        .select("id, status, images")
        .eq("manuscript_id", manuscriptId)
        .in("status", ["queued", "running"])
        .order("requested_at", { ascending: false })
        .limit(1);

      if (cancelled || error || !data || data.length === 0) {
        return;
      }

      const active = data[0];
      if (typeof active?.id !== "string") return;

      const activeImages = Array.isArray(active.images) ? (active.images as CoverImage[]) : [];
      if (activeImages.length > 0) {
        setImages(activeImages.slice(0, 4));
        setDisplayJobId(active.id);
      }

      setActiveJobId(active.id);
      setIsGenerating(true);
      void pollJob(active.id, 1);
    }

    void loadActiveJob();
    return () => {
      cancelled = true;
    };
  }, [manuscriptId, supabase]);

  useEffect(() => {
    if (previewIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewIndex(null);
        return;
      }

      if (event.key === "ArrowRight") {
        setPreviewIndex((current) => {
          if (current === null) return null;
          const next = current + 1;
          return next >= images.length ? current : next;
        });
      }

      if (event.key === "ArrowLeft") {
        setPreviewIndex((current) => {
          if (current === null) return null;
          const prev = current - 1;
          return prev < 0 ? current : prev;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, images.length]);

  async function saveOverlayConfig(): Promise<void> {
    setSavingOverlay(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const currentMetadata =
      manuscriptMetadata && typeof manuscriptMetadata === "object"
        ? manuscriptMetadata
        : {};

    const mergedMetadata = {
      ...currentMetadata,
      cover_overlay_config: overlayConfig,
    };

    const { error } = await supabase
      .from("manuscripts")
      .update({
        metadata: mergedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", manuscriptId);

    if (error) {
      console.error("Failed to save cover overlay config:", error);
      setErrorMessage("Failed to save overlay settings.");
    } else {
      setStatusMessage("Overlay settings saved.");
    }

    setSavingOverlay(false);
  }

  async function pollJob(jobId: string, attempt = 1): Promise<void> {
    if (attempt > COVER_POLL_MAX_ATTEMPTS) {
      setIsGenerating(false);
      setActiveJobId(null);
      setErrorMessage("Generation timed out after ~5 minutes. You can retry or regenerate.");
      return;
    }

    setPollCount(attempt);
    let response: Response;
    try {
      response = await fetch(`/api/covers/jobs/${jobId}`, { method: "GET" });
    } catch (error) {
      console.error("Failed to poll cover job status:", error);
      setIsGenerating(false);
      setActiveJobId(null);
      setErrorMessage("Failed to check generation status.");
      return;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setIsGenerating(false);
      setActiveJobId(null);
      setErrorMessage(payload.error || "Failed to check generation status.");
      return;
    }

    const payload = (await response.json()) as CoverJobResponse;
    const nextImages = Array.isArray(payload.images) ? payload.images : [];
    const nextCompleted = Array.isArray(payload.completed_images) ? payload.completed_images : [];
    const nextBlockedCount = Math.max(0, nextImages.length - nextCompleted.length);

    if (nextImages.length > 0) {
      setImages(nextImages.slice(0, 4));
      setDisplayJobId(jobId);
      setBlockedCount(nextBlockedCount);
    }

    if (payload.status === "completed" || payload.status === "failed") {
      setIsGenerating(false);
      setActiveJobId(null);
      if (payload.status === "failed") {
        setErrorMessage(payload.error_message || "Cover generation failed.");
      } else {
        setStatusMessage(nextBlockedCount > 0
          ? `${nextCompleted.length} of ${nextImages.length || 4} images generated (${nextBlockedCount} blocked by safety filter).`
          : "Cover generation completed.");
      }
      return;
    }

    const retryAfterSeconds = payload.retry_after
      ? Math.max(
          0,
          Math.round(
            (new Date(payload.retry_after).getTime() - Date.now()) / 1000
          )
        )
      : null;

    if (payload.status === "queued") {
      setStatusMessage(
        retryAfterSeconds && retryAfterSeconds > 0
          ? `Generation queued - high demand, retrying in about ${retryAfterSeconds}s.`
          : "Generation queued - high demand, retrying shortly."
      );
    } else {
      setStatusMessage(`Generating covers... (poll ${attempt}/${COVER_POLL_MAX_ATTEMPTS})`);
    }

    const nextDelaySeconds = Math.max(
      getCoverPollDelaySeconds(attempt),
      retryAfterSeconds && retryAfterSeconds > 0 ? Math.min(10, retryAfterSeconds) : 0
    );
    pollTimeoutRef.current = setTimeout(() => {
      void pollJob(jobId, attempt + 1);
    }, nextDelaySeconds * 1000);
  }

  async function generateCovers(): Promise<void> {
    setErrorMessage(null);
    setStatusMessage(null);

    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 10) {
      setErrorMessage("Please provide a visual description with at least 10 characters.");
      return;
    }

    if (isActiveJob) {
      setErrorMessage("A cover generation job is already active for this manuscript.");
      return;
    }

    setIsGenerating(true);
    setPollCount(0);

    let response: Response;
    try {
      response = await fetch(`/api/manuscripts/${manuscriptId}/covers/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre,
          mood,
          style,
          description: trimmedDescription,
        }),
      });
    } catch (error) {
      console.error("Failed to start cover generation:", error);
      setIsGenerating(false);
      setErrorMessage("Failed to start cover generation.");
      return;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setIsGenerating(false);
      setErrorMessage(payload.error || "Failed to start cover generation.");
      return;
    }

    const jobId = String(payload.job_id || "");
    if (!jobId) {
      setIsGenerating(false);
      setErrorMessage("Cover generation returned an invalid job id.");
      return;
    }

    setActiveJobId(jobId);
    setStatusMessage("Cover generation started.");
    void pollJob(jobId, 1);
  }

  async function saveToGallery(imageUrl: string): Promise<void> {
    if (!displayJobId) {
      setErrorMessage("No completed job available for this image.");
      return;
    }

    setActioningImageUrl(imageUrl);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/covers/jobs/${displayJobId}/save-to-gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(payload.error || "Failed to save image to gallery.");
      } else {
        setStatusMessage("Saved to gallery.");
      }
    } catch (error) {
      console.error("Failed to save generated cover to gallery:", error);
      setErrorMessage("Failed to save image to gallery.");
    } finally {
      setActioningImageUrl(null);
    }
  }

  async function selectAsBookCover(): Promise<void> {
    if (!pendingSelectionUrl || !displayJobId) {
      setPendingSelectionUrl(null);
      return;
    }

    const selectedImageUrl = pendingSelectionUrl;

    setActioningImageUrl(selectedImageUrl);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/covers/jobs/${displayJobId}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: selectedImageUrl,
          confirm: true,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(payload.error || "Failed to select image as book cover.");
      } else {
        setAppliedCoverUrl(String(payload.cover_url || selectedImageUrl));
        setStatusMessage("Book cover updated.");
      }
    } catch (error) {
      console.error("Failed to select generated cover as book cover:", error);
      setErrorMessage("Failed to select image as book cover.");
    } finally {
      setPendingSelectionUrl(null);
      setActioningImageUrl(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-stone-900">Cover Lab</h2>
          <p className="text-sm text-stone-600">
            Generate AI cover concepts from your manuscript metadata and visual description.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-stone-700">Genre</span>
            <select
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2"
            >
              {GENRE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-stone-700">Mood</span>
            <select
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2"
            >
              {MOOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-stone-700">Art Style</span>
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value as CoverStyle)}
              className="w-full rounded-md border border-stone-300 px-3 py-2"
            >
              {STYLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-stone-700">Title (Overlay)</span>
            <input
              value={manuscriptTitle}
              disabled
              className="w-full rounded-md border border-stone-300 bg-stone-100 px-3 py-2 text-stone-600"
            />
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-stone-700">Author (Overlay)</span>
            <input
              value={authorName || "Author Name"}
              disabled
              className="w-full rounded-md border border-stone-300 bg-stone-100 px-3 py-2 text-stone-600"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-1 text-sm">
          <span className="font-medium text-stone-700">Visual Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Describe your cover concept (setting, lighting, composition, subject, style details)..."
            className="w-full rounded-md border border-stone-300 px-3 py-2"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void generateCovers()}
            disabled={isActiveJob}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isActiveJob ? "Generating..." : "Generate"}
          </button>

          <button
            onClick={() => void generateCovers()}
            disabled={isActiveJob || images.length === 0}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Regenerate
          </button>

          {isActiveJob && (
            <span className="text-xs font-medium text-amber-700">
              Active job in progress ({pollCount}/{COVER_POLL_MAX_ATTEMPTS})
            </span>
          )}
        </div>

        {statusMessage && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{statusMessage}</p>
        )}
        {errorMessage && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        )}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-900">Text Overlay Controls</h3>
            <p className="text-sm text-stone-600">
              Apply title and author as UI text overlay on generated artwork.
            </p>
          </div>
          <button
            onClick={() => void saveOverlayConfig()}
            disabled={savingOverlay}
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
          >
            {savingOverlay ? "Saving..." : "Save Overlay Settings"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-stone-700">Font</span>
            <select
              value={overlayConfig.fontFamily}
              onChange={(event) =>
                setOverlayConfig((current) => ({
                  ...current,
                  fontFamily: event.target.value as OverlayFont,
                }))
              }
              className="w-full rounded-md border border-stone-300 px-3 py-2"
            >
              <option value="serif">Serif</option>
              <option value="sans-serif">Sans Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-stone-700">Position</span>
            <select
              value={overlayConfig.position}
              onChange={(event) =>
                setOverlayConfig((current) => ({
                  ...current,
                  position: event.target.value as OverlayPosition,
                }))
              }
              className="w-full rounded-md border border-stone-300 px-3 py-2"
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-stone-700">Color</span>
            <input
              type="color"
              value={overlayConfig.color}
              onChange={(event) =>
                setOverlayConfig((current) => ({
                  ...current,
                  color: event.target.value,
                }))
              }
              className="h-10 w-full rounded-md border border-stone-300 p-1"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-stone-700">Opacity</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={overlayConfig.opacity}
              onChange={(event) =>
                setOverlayConfig((current) => ({
                  ...current,
                  opacity: Number(event.target.value),
                }))
              }
              className="w-full"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-stone-900">Generated Covers</h3>
          <span className="text-sm text-stone-600">
            {images.length > 0 ? `${completedCount} of 4 images generated` : "No generated covers yet"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((index) => {
            const image = images[index];
            const imageUrl = typeof image?.url === "string" ? image.url : null;
            const altText = description.trim() || "Generated book cover concept";

            return (
              <div key={index} className="rounded-lg border border-stone-200 p-3">
                <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-stone-100">
                  {imageUrl ? (
                    <button
                      onClick={() => setPreviewIndex(index)}
                      className="h-full w-full"
                      aria-label={`Open preview for generated cover ${index + 1}`}
                    >
                      <img
                        src={imageUrl}
                        alt={altText}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : isActiveJob ? (
                    <div className="h-full w-full animate-pulse bg-gradient-to-br from-stone-200 to-stone-300" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-stone-500">
                      Slot {index + 1}
                    </div>
                  )}
                </div>

                {imageUrl && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      onClick={() => void saveToGallery(imageUrl)}
                      disabled={actioningImageUrl === imageUrl}
                      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
                    >
                      Save to Gallery
                    </button>
                    <button
                      onClick={() => setPendingSelectionUrl(imageUrl)}
                      disabled={actioningImageUrl === imageUrl}
                      className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Select as Book Cover
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {blockedCount > 0 && (
          <p className="mt-3 text-sm text-amber-700">
            {completedCount} of 4 images generated - {blockedCount} blocked by safety filter.
          </p>
        )}
      </section>

      {pendingSelectionUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-label="Confirm cover replacement"
            className="w-full max-w-3xl rounded-lg bg-white p-6"
          >
            <h4 className="text-lg font-semibold text-stone-900">Replace current cover?</h4>
            <p className="mt-1 text-sm text-stone-600">
              This will replace your current cover. Continue?
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Current Cover</p>
                <div className="aspect-[2/3] overflow-hidden rounded-md bg-stone-100">
                  {appliedCoverUrl ? (
                    <img src={appliedCoverUrl} alt="Current cover" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-stone-500">
                      No current cover
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">New Cover</p>
                <div className="aspect-[2/3] overflow-hidden rounded-md bg-stone-100">
                  <img
                    src={pendingSelectionUrl}
                    alt={description.trim() || "Selected generated cover"}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setPendingSelectionUrl(null)}
                className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={() => void selectAsBookCover()}
                className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPreviewImage && typeof selectedPreviewImage.url === "string" && (
        <div className="fixed inset-0 z-50 bg-black/80">
          <div
            role="dialog"
            aria-label="Generated cover preview"
            aria-modal="true"
            className="relative flex h-full w-full items-center justify-center p-4"
          >
            <button
              onClick={() => setPreviewIndex(null)}
              className="absolute right-4 top-4 rounded-md bg-black/70 px-3 py-2 text-sm font-medium text-white"
            >
              Close (Esc)
            </button>

            <div className="relative h-full w-full max-w-3xl md:h-auto">
              <img
                src={selectedPreviewImage.url}
                alt={description.trim() || "Generated cover preview"}
                className="h-full w-full rounded-md object-contain"
              />
              <div
                className={`pointer-events-none absolute left-4 right-4 ${getOverlayPositionClass(overlayConfig.position)} ${getOverlayFontClass(overlayConfig.fontFamily)}`}
                style={{
                  color: getColorWithOpacity(overlayConfig.color, overlayConfig.opacity),
                  textShadow: "0 2px 6px rgba(0,0,0,0.6)",
                }}
              >
                <p className="text-center text-xl font-semibold sm:text-2xl">{manuscriptTitle}</p>
                <p className="mt-1 text-center text-sm sm:text-base">{authorName || "Author Name"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
