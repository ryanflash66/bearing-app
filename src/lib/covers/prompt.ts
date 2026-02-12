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

  return [
    "Flat artwork illustration for use as a book cover background.",
    "Do NOT render a 3D book, book spine, book mockup, or any book object.",
    "Do NOT include any text, letters, words, titles, logos, watermarks, or typography anywhere in the image.",
    "The image must be purely visual artwork with absolutely zero written characters.",
    `Genre: ${trimmedGenre}. Mood: ${trimmedMood}. Style: ${input.style}.`,
    template.styleHint + ".",
    template.compositionHint + ".",
    `Visual brief: ${trimmedDescription}.`,
    "Leave space for title and author text to be added as an overlay later.",
    "Aspect ratio: portrait 3:4.",
  ]
    .join(" ");
}

export function buildCoverPromptPayload(input: BuildCoverPromptInput): {
  wrappedPrompt: string;
  negativePrompt: string;
  aspectRatio: "3:4";
} {
  return {
    wrappedPrompt: buildWrappedCoverPrompt(input),
    negativePrompt: "",
    aspectRatio: "3:4",
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
  // Clamp to Vertex AI's valid seed range: 1–2147483647
  return Math.max(1, (hash >>> 0) % 2147483647);
}

export function generateVariationSeeds(baseSeed: number, count = 4): number[] {
  const safeBaseSeed = Math.max(1, Math.floor(baseSeed) % 2147483647 || 1);
  const seeds = new Set<number>();

  for (let index = 0; index < count * 4; index += 1) {
    const candidate = ((safeBaseSeed + index * 7919) % 2147483647) || 1;
    seeds.add(candidate);
    if (seeds.size === count) break;
  }

  return Array.from(seeds).slice(0, count);
}

