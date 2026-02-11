import { distance } from "fastest-levenshtein";
import { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface NavigationResult {
  found: boolean;
  position?: { from: number; to: number };
  warning?: string;
}

type TextSegment = {
  from: number;
  text: string;
  startOffset: number;
  endOffset: number;
};

function buildTextIndex(doc: ProseMirrorNode): { text: string; segments: TextSegment[] } {
  const segments: Omit<TextSegment, "startOffset" | "endOffset">[] = [];

  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (!node.isText) return;
    const text = node.text ?? "";
    if (!text) return;
    segments.push({ from: pos, text });
  });

  const indexed: TextSegment[] = [];
  let offset = 0;
  for (const seg of segments) {
    const startOffset = offset;
    const endOffset = offset + seg.text.length;
    indexed.push({ ...seg, startOffset, endOffset });
    offset = endOffset;
  }

  return { text: indexed.map((s) => s.text).join(""), segments: indexed };
}

function textOffsetToDocPos(segments: TextSegment[], offset: number): number | null {
  if (offset < 0) return null;
  if (segments.length === 0) return null;

  const last = segments[segments.length - 1];
  const totalLength = last.endOffset;
  if (offset > totalLength) return null;
  if (offset === totalLength) return last.from + last.text.length;

  for (const seg of segments) {
    if (offset >= seg.startOffset && offset < seg.endOffset) {
      return seg.from + (offset - seg.startOffset);
    }
  }

  return null;
}

export function findExactCaseInsensitiveRange(
  editor: Editor,
  originalText: string
): { from: number; to: number } | null {
  const { text, segments } = buildTextIndex(editor.state.doc);
  const lowerContent = text.toLowerCase();
  const lowerOriginal = originalText.toLowerCase();

  const index = lowerContent.indexOf(lowerOriginal);
  if (index === -1) return null;

  const from = textOffsetToDocPos(segments, index);
  const to = textOffsetToDocPos(segments, index + originalText.length);
  if (from === null || to === null) return null;

  return { from, to };
}

/**
 * AC 8.7.3: Navigate to text in editor with fuzzy matching fallback
 *
 * Text Matching Strategy:
 * - Primary: Case-insensitive exact substring match
 * - Fallback: Fuzzy match using Levenshtein distance
 * - Failure UX: Show warning if no match found
 */
export async function navigateToText(
  editor: Editor,
  originalText: string
): Promise<NavigationResult> {
  if (!originalText.trim()) {
    return { found: false, warning: "No text to locate." };
  }

  const exactRange = findExactCaseInsensitiveRange(editor, originalText);

  if (exactRange) {
    editor.commands.setTextSelection(exactRange);
    editor.commands.scrollIntoView();

    (editor.commands as unknown as { setTemporaryHighlight?: (opts: { from: number; to: number; durationMs?: number }) => void })
      .setTemporaryHighlight?.({ ...exactRange, durationMs: 2000 });

    return { found: true, position: exactRange };
  }

  // Fallback: Fuzzy match in flattened text, then map to doc positions.
  const { text, segments } = buildTextIndex(editor.state.doc);
  const fuzzyOffsets = fuzzyMatchOffsets(text, originalText);

  if (fuzzyOffsets) {
    const from = textOffsetToDocPos(segments, fuzzyOffsets.from);
    const to = textOffsetToDocPos(segments, fuzzyOffsets.to);
    if (from !== null && to !== null) {
      editor.commands.setTextSelection({ from, to });
      editor.commands.scrollIntoView();

      (editor.commands as unknown as { setTemporaryHighlight?: (opts: { from: number; to: number; durationMs?: number }) => void })
        .setTemporaryHighlight?.({ from, to, durationMs: 2000 });

      return { found: true, position: { from, to } };
    }
  }

  // No match found
  const truncated = originalText.length > 45
    ? `${originalText.slice(0, 45)}...`
    : originalText;

  return {
    found: false,
    warning: `Text may have changed since the check. Original: "${truncated}"`,
  };
}

/**
 * AC 8.7.3: Fuzzy match using Levenshtein distance
 * Unified threshold: maxDistance = Math.max(3, Math.floor(originalText.length * 0.1))
 */
function fuzzyMatchOffsets(
  content: string,
  originalText: string
): { from: number; to: number } | null {
  const normalizedContent = content.toLowerCase();
  const normalizedOriginal = originalText.toLowerCase();
  const maxDistance = Math.max(3, Math.floor(originalText.length * 0.1));
  const originalLength = normalizedOriginal.length;

  // Slide a window of similar length across the content
  for (let i = 0; i <= normalizedContent.length - originalLength; i++) {
    const windowText = normalizedContent.slice(i, i + originalLength);
    const dist = distance(normalizedOriginal, windowText);

    if (dist <= maxDistance) {
      return { from: i, to: i + originalLength };
    }
  }

  // Try windows with ±10% length variation
  const minLength = Math.floor(originalLength * 0.9);
  const maxLength = Math.floor(originalLength * 1.1);

  for (let len = minLength; len <= maxLength; len++) {
    if (len === originalLength) continue; // Already tried exact length

    for (let i = 0; i <= normalizedContent.length - len; i++) {
      const windowText = normalizedContent.slice(i, i + len);
      const dist = distance(normalizedOriginal, windowText);

      if (dist <= maxDistance) {
        return { from: i, to: i + len };
      }
    }
  }

  return null;
}

export function replaceExactCaseInsensitiveText(
  editor: Editor,
  originalText: string,
  replacementText: string
): { replaced: true; position: { from: number; to: number } } | { replaced: false } {
  const range = findExactCaseInsensitiveRange(editor, originalText);
  if (!range) return { replaced: false };

  editor.commands.insertContentAt(range, replacementText);
  return { replaced: true, position: range };
}
