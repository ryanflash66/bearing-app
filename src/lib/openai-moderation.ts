/**
 * OpenAI Moderation API helper
 * Story 6.3: Admin Blog Moderation (Automated Safety)
 */

const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations";
const OPENAI_MODERATION_MODEL = "omni-moderation-latest";

const FLAG_THRESHOLD = 0.6;
const HOLD_THRESHOLD = 0.85;

export const OPENAI_MODERATION_SOURCE = "openai_moderation";

interface OpenAIModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
}

interface OpenAIModerationResponse {
  results: OpenAIModerationResult[];
}

export interface ModerationDecision {
  skipped: boolean;
  flagged: boolean;
  shouldHold: boolean;
  maxScore: number;
  topCategory: string | null;
  reason: string | null;
}

export function isOpenAIModerationConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function getApiKey(): string | null {
  return process.env.OPENAI_API_KEY || null;
}

function formatCategory(category: string | null): string {
  if (!category) return "policy";
  return category.replace(/_/g, " ");
}

function buildReason(category: string | null, score: number): string {
  const label = formatCategory(category);
  const normalizedScore = Number.isFinite(score) ? score.toFixed(2) : "0.00";
  return `OpenAI moderation flagged: ${label} (${normalizedScore})`;
}

export async function evaluateOpenAIModeration(
  input: string
): Promise<ModerationDecision> {
  const trimmed = input?.trim();
  if (!trimmed) {
    return {
      skipped: true,
      flagged: false,
      shouldHold: false,
      maxScore: 0,
      topCategory: null,
      reason: null,
    };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      skipped: true,
      flagged: false,
      shouldHold: false,
      maxScore: 0,
      topCategory: null,
      reason: null,
    };
  }

  try {
    const response = await fetch(OPENAI_MODERATION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODERATION_MODEL,
        input: trimmed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `OpenAI moderation API error: ${response.status} ${response.statusText}`,
        errorText
      );
      return {
        skipped: true,
        flagged: false,
        shouldHold: false,
        maxScore: 0,
        topCategory: null,
        reason: null,
      };
    }

    const data: OpenAIModerationResponse = await response.json();
    const result = data?.results?.[0];

    if (!result) {
      return {
        skipped: true,
        flagged: false,
        shouldHold: false,
        maxScore: 0,
        topCategory: null,
        reason: null,
      };
    }

    const scores = result.category_scores || {};
    let maxScore = 0;
    let topCategory: string | null = null;

    for (const [category, score] of Object.entries(scores)) {
      if (typeof score === "number" && score > maxScore) {
        maxScore = score;
        topCategory = category;
      }
    }

    const flagged = Boolean(result.flagged) || maxScore >= FLAG_THRESHOLD;
    const shouldHold = flagged && maxScore >= HOLD_THRESHOLD;
    const reason = flagged ? buildReason(topCategory, maxScore) : null;

    return {
      skipped: false,
      flagged,
      shouldHold,
      maxScore,
      topCategory,
      reason,
    };
  } catch (error) {
    console.error("OpenAI moderation request failed:", error);
    return {
      skipped: true,
      flagged: false,
      shouldHold: false,
      maxScore: 0,
      topCategory: null,
      reason: null,
    };
  }
}
