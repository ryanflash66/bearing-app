/**
 * Lightweight manuscript types used by client-side modals, dropdowns, and
 * the GET /api/manuscripts endpoint.  The canonical full-schema type lives in
 * `src/lib/manuscripts.ts` (Manuscript) -- use that when you need every column.
 */

/** Minimal manuscript shape returned by GET /api/manuscripts. */
export interface ManuscriptSummary {
  id: string;
  title: string;
  metadata?: {
    author_name?: string;
    bisac_codes?: string[];
    [key: string]: unknown;
  };
}

/** Response shape from GET /api/manuscripts. */
export interface ManuscriptsApiResponse {
  manuscripts: ManuscriptSummary[];
  userDisplayName?: string;
  error?: string;
}

/**
 * Fetch the current user's manuscripts from /api/manuscripts.
 * Returns the parsed response or throws on network error.
 */
export async function fetchManuscriptsSummary(): Promise<ManuscriptsApiResponse> {
  const response = await fetch("/api/manuscripts");

  if (!response.ok) {
    let message = "Failed to load manuscripts";
    try {
      const data = await response.json();
      if (data.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  const data: ManuscriptsApiResponse = await response.json();

  return {
    manuscripts: data.manuscripts ?? [],
    userDisplayName: data.userDisplayName,
  };
}
