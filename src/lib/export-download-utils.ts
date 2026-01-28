/**
 * Export download utility functions (Story 8.1)
 *
 * These utilities handle client-side export download functionality
 * with proper error handling, CORS compliance, and RFC 5987 filename support.
 */

/**
 * Parse filename from Content-Disposition header with RFC 5987 support
 *
 * Supports:
 * - Basic format: filename="name.pdf"
 * - Unquoted format: filename=name.pdf
 * - RFC 5987 format: filename*=UTF-8''encoded%20name.pdf
 *
 * RFC 5987 (filename*) takes precedence when both are present.
 *
 * @param header - Content-Disposition header value
 * @param fallback - Fallback filename if parsing fails
 * @returns Parsed filename or fallback
 */
export function parseFilenameFromContentDisposition(
  header: string | null,
  fallback: string
): string {
  if (!header) {
    return fallback;
  }

  // Try RFC 5987 format first (filename*=charset'lang'percent-encoded)
  // Example: filename*=UTF-8''My%20Book.pdf
  //
  // Some implementations quote the whole value; we tolerate that.
  const parts = header.split(";").map((p) => p.trim());
  const filenameStarPart = parts.find((p) => /^filename\*\s*=/i.test(p));
  if (filenameStarPart) {
    const raw = filenameStarPart.split("=").slice(1).join("=").trim();
    const unquoted =
      (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
        ? raw.slice(1, -1)
        : raw;

    const firstTick = unquoted.indexOf("'");
    const secondTick = firstTick >= 0 ? unquoted.indexOf("'", firstTick + 1) : -1;
    if (firstTick >= 0 && secondTick >= 0) {
      const encodedValue = unquoted.slice(secondTick + 1);
      try {
        return decodeURIComponent(encodedValue);
      } catch {
        // Fall through to other formats
      }
    }
  }

  // Try quoted filename format: filename="name.pdf"
  const quotedMatch = header.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  // Try unquoted filename format: filename=name.pdf
  const unquotedMatch = header.match(/filename\s*=\s*([^;\s]+)/i);
  if (unquotedMatch) {
    return unquotedMatch[1];
  }

  return fallback;
}

/**
 * Map HTTP status codes to user-friendly error messages
 *
 * @param status - HTTP status code
 * @returns User-friendly error message
 */
export function mapHttpStatusToMessage(status: number): string {
  switch (status) {
    case 400:
      return "Invalid export request. Please try again.";
    case 401:
      return "Please log in to export your manuscript";
    case 403:
      return "You don't have permission to export this manuscript";
    case 404:
      return "Manuscript not found";
    case 429:
      return "Export rate limited. Please wait a moment and try again.";
    case 500:
      return "Server error. Please try again or contact support";
    default:
      return `Export failed (Error ${status}). Please try again`;
  }
}

/**
 * Validate export response before processing
 *
 * Checks for:
 * - Opaque response (CORS issue)
 * - HTTP error status codes
 *
 * @param response - Fetch response object
 * @returns Validation result with error message if invalid
 */
export function validateExportResponse(response: Response): {
  valid: boolean;
  error: string | null;
} {
  // Check for opaque response (CORS blocking)
  if (response.type === "opaque") {
    return {
      valid: false,
      error:
        "CORS configuration issue. The export could not be downloaded. Please contact support.",
    };
  }

  // Check for HTTP errors
  if (!response.ok) {
    return {
      valid: false,
      error: mapHttpStatusToMessage(response.status),
    };
  }

  return {
    valid: true,
    error: null,
  };
}

/**
 * Expected MIME types for export formats
 */
const EXPECTED_MIME_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
};

/**
 * Create a download from a blob with validation
 *
 * Validates:
 * - Blob is not empty
 * - MIME type matches expected format
 *
 * Creates a temporary download link, triggers click, and cleans up.
 * Uses a timeout for cleanup to ensure download starts before revocation.
 *
 * @param blob - Blob to download
 * @param filename - Target filename
 * @returns Result with success status and optional error
 */
export async function createDownloadFromBlob(
  blob: Blob,
  filename: string
): Promise<{ success: boolean; error: string | null }> {
  // Validate blob is not empty
  if (blob.size === 0) {
    return {
      success: false,
      error:
        "Export file is empty. Please try again or contact support if the issue persists.",
    };
  }

  // Determine expected format from filename
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  const expectedTypes = EXPECTED_MIME_TYPES[extension] || [];

  // Validate MIME type (allow octet-stream as fallback)
  if (
    expectedTypes.length > 0 &&
    !expectedTypes.includes(blob.type) &&
    blob.type !== "application/octet-stream"
  ) {
    return {
      success: false,
      error: `Downloaded file has unexpected format (${blob.type || "unknown"}). Expected ${extension.toUpperCase()}.`,
    };
  }

  try {
    // Create object URL
    const downloadUrl = window.URL.createObjectURL(blob);

    // Create temporary download link
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = "none";

    // Add to DOM, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL after a short delay to ensure download starts
    // Using 100ms delay is sufficient for the browser to initiate the download
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to initiate download: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Fetch options for export requests
 *
 * Uses 'same-origin' mode (not 'cors') because export endpoints are on the same origin.
 * Includes credentials for authenticated requests.
 */
export const EXPORT_FETCH_OPTIONS: RequestInit = {
  method: "GET",
  // Export endpoints are relative (same-origin). Using same-origin avoids any
  // accidental cross-origin fetch behavior and keeps auth cookies included.
  mode: "same-origin",
  credentials: "include",
};

function sanitizeFilenameForDownload(
  filename: string,
  fallback: string
): string {
  const cleaned = filename
    // Remove any path components (defense-in-depth)
    .split(/[\\/]/g)
    .pop()
    // Replace characters invalid on Windows/macOS filesystems and problematic in headers
    ?.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return fallback;

  // Avoid reserved device names on Windows (CON, PRN, AUX, NUL, COM1.., LPT1..)
  const base = cleaned.replace(/\.[^.]+$/, "");
  const upper = base.toUpperCase();
  if (
    upper === "CON" ||
    upper === "PRN" ||
    upper === "AUX" ||
    upper === "NUL" ||
    /^COM[1-9]$/.test(upper) ||
    /^LPT[1-9]$/.test(upper)
  ) {
    return `download-${Date.now()}`;
  }

  return cleaned.length > 180 ? cleaned.slice(0, 180) : cleaned;
}

function isSafeServerErrorMessage(message: unknown): message is string {
  if (typeof message !== "string") return false;
  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > 160) return false;

  // Heuristic: avoid leaking internals (stack traces, library/runtime names, etc.)
  const lower = trimmed.toLowerCase();
  const suspicious = [
    "puppeteer",
    "stack",
    "trace",
    "nodejs",
    "errno",
    "econn",
    "at ",
    "referenceerror",
    "typeerror",
  ];
  return !suspicious.some((s) => lower.includes(s));
}

/**
 * Perform export download with full error handling
 *
 * This is the main function that orchestrates the entire download flow:
 * 1. Fetch the export endpoint
 * 2. Validate the response
 * 3. Create blob and trigger download
 *
 * @param url - Export endpoint URL
 * @param fallbackFilename - Fallback filename if Content-Disposition is missing
 * @returns Result with success status, filename, and optional error
 */
export async function performExportDownload(
  url: string,
  fallbackFilename: string
): Promise<{ success: boolean; filename: string; error: string | null }> {
  try {
    // Fetch with proper options
    const response = await fetch(url, EXPORT_FETCH_OPTIONS);

    // Validate response
    const validation = validateExportResponse(response);
    if (!validation.valid) {
      // Try to get more specific error from response body if available (only when safe)
      try {
        const contentType = response.headers.get("Content-Type");
        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          if (
            (response.status === 400 ||
              response.status === 401 ||
              response.status === 403 ||
              response.status === 404) &&
            isSafeServerErrorMessage(errorData.error)
          ) {
            return {
              success: false,
              filename: "",
              error: errorData.error,
            };
          }
        }
      } catch {
        // Ignore parsing errors, use default message
      }

      return {
        success: false,
        filename: "",
        error: validation.error || "Export failed",
      };
    }

    // Parse filename from Content-Disposition header
    const contentDisposition = response.headers.get("Content-Disposition");
    const parsedFilename = parseFilenameFromContentDisposition(
      contentDisposition,
      fallbackFilename
    );
    const filename = sanitizeFilenameForDownload(parsedFilename, fallbackFilename);

    // Create blob from response
    const blob = await response.blob();

    // Create download
    const downloadResult = await createDownloadFromBlob(blob, filename);
    if (!downloadResult.success) {
      return {
        success: false,
        filename,
        error: downloadResult.error || "Download failed",
      };
    }

    return {
      success: true,
      filename,
      error: null,
    };
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        filename: "",
        error: "Network error. Please check your connection and try again.",
      };
    }

    return {
      success: false,
      filename: "",
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during export",
    };
  }
}
