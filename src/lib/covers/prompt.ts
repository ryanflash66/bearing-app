export type CoverStyle = "Cinematic" | "Illustrated" | "Minimalist";

interface BuildCoverPromptInput {
  description: string;
  genre: string;
  mood: string;
  style: CoverStyle;
  title?: string;
  authorName?: string;
}

interface CoverPromptTemplate {
  styleHint: string;
  compositionHint: string;
}

const NEGATIVE_PROMPT =
  "no text, no words, no letters, no typography, no logo, no watermark, no signature, no caption";

const STYLE_TEMPLATES: Record<CoverStyle, CoverPromptTemplate> = {
  Cinematic: {
    styleHint:
      "cinematic lighting, dramatic atmosphere, rich depth, high-end concept art look",
    compositionHint: "bold focal point, dynamic framing, premium publish-ready tone",
  },
  Illustrated: {
    styleHint:
      "illustrative painted style, intentional brush texture, vivid color storytelling",
    compositionHint: "clear subject separation, expressive shapes, editorial cover clarity",
  },
  Minimalist: {
    styleHint:
      "minimalist design language, restrained palette, clean geometry, negative space",
    compositionHint:
      "single strong visual metaphor, simplified forms, uncluttered composition",
  },
};

export function buildWrappedCoverPrompt(input: BuildCoverPromptInput): string {
  const template = STYLE_TEMPLATES[input.style];
  const trimmedDescription = input.description.trim();
  const trimmedGenre = input.genre.trim();
  const trimmedMood = input.mood.trim();

  const titleHint = input.title?.trim()
    ? `Reference title context: "${input.title.trim()}".`
    : "";
  const authorHint = input.authorName?.trim()
    ? `Reference author context: "${input.authorName.trim()}".`
    : "";

  return [
    "Professional book cover illustration for a modern publishing concept.",
    "Generate artwork only; final title/author text will be overlaid by UI.",
    `Genre: ${trimmedGenre}. Mood: ${trimmedMood}. Style: ${input.style}.`,
    template.styleHint + ".",
    template.compositionHint + ".",
    `Visual brief: ${trimmedDescription}.`,
    titleHint,
    authorHint,
    `Negative prompt: ${NEGATIVE_PROMPT}.`,
    "Aspect ratio: portrait 2:3.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildCoverPromptPayload(input: BuildCoverPromptInput): {
  wrappedPrompt: string;
  negativePrompt: string;
  aspectRatio: "2:3";
} {
  return {
    wrappedPrompt: buildWrappedCoverPrompt(input),
    negativePrompt: NEGATIVE_PROMPT,
    aspectRatio: "2:3",
  };
}

export function createDeterministicSeed(base: string): number {
  let hash = 2166136261;
  for (let index = 0; index < base.length; index += 1) {
    hash ^= base.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

export function generateVariationSeeds(baseSeed: number, count = 4): number[] {
  const safeBaseSeed = Math.max(1, Math.floor(baseSeed) || 1);
  const seeds = new Set<number>();

  for (let index = 0; index < count * 4; index += 1) {
    const candidate = safeBaseSeed + index * 7919;
    seeds.add(candidate);
    if (seeds.size === count) break;
  }

  return Array.from(seeds).slice(0, count);
}

