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
  const data: ManuscriptsApiResponse = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to load manuscripts");
  }

  return {
    manuscripts: data.manuscripts ?? [],
    userDisplayName: data.userDisplayName,
  };
}
