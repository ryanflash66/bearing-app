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
    "Generate ONE full-bleed PORTRAIT 3:4 flat 2D illustration/poster background artwork (a single image on a flat plane).",
    "This is ONLY background art for later title/author overlay.",
    "",
    `Scene/visual brief: ${trimmedDescription}.`,
    `Convey the feel of ${trimmedGenre} and ${trimmedMood} ONLY through imagery, color palette, lighting, atmosphere, and motifs — NEVER by writing any words.`,
    "",
    `Style target: ${input.style}. Apply: ${template.styleHint}. Composition: ${template.compositionHint}.`,
    "Leave clean \"breathing room\" for overlay text: keep the top ~20% and bottom ~15% simpler/less detailed; place the main focal point away from extreme top/bottom.",
    "",
    "ABSOLUTE MUST-NOT INCLUDE (if any appear, the image is wrong):",
    "- ANY text/typography/letters/words/numbers/characters of any kind (including garbled/faux text, rune-like glyphs, signatures, watermarks, logos, labels, signage, UI, stamps, emblems with letters).",
    "- ANY book-related objects or mockups (no book, spine, cover, open book, pages, stacks of books, product render, box/mockup, \"cover layout\", title blocks, author placeholders, banners).",
    "",
    "Output: clean, print-ready flat artwork only, no borders/frames/insets, no mockup presentation.",
  ]
    .join("\n");
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

