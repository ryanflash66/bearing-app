import { Editor } from "@tiptap/react";
import { MutableRefObject } from "react";

// --- Character Extraction Logic ---

const COMMON_WORDS = new Set([
  "The", "This", "That", "These", "Those", "What", "When", "Where", "Which", "Who",
  "How", "Why", "Chapter", "Part", "Section", "Book", "Story", "Page", "Monday",
  "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January",
  "February", "March", "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "I", "He", "She", "It", "They", "We", "You",
]);

const NAME_PATTERN = /\b([A-Z][a-z]{2,})\b/g;
const MIN_MENTIONS = 3;
const MAX_CHARACTERS = 50;

export type CharacterInfo = { name: string; firstMention: number };

/**
 * Extracts potential character names from text content.
 * Returns a list of names sorted by frequency.
 */
export function extractCharacters(content: string): CharacterInfo[] {
  if (!content) return [];

  const nameCounts = new Map<string, { count: number; firstMention: number }>();
  let match: RegExpExecArray | null;

  // Reset lastIndex because regex is global (though creating new one here matches user implementation)
  // Re-creating regex inside function is safer for stateless utility
  const regex = new RegExp(NAME_PATTERN);

  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    if (COMMON_WORDS.has(name)) continue;

    const existing = nameCounts.get(name);
    if (existing) {
      existing.count++;
    } else {
      nameCounts.set(name, { count: 1, firstMention: match.index });
    }
  }

  return Array.from(nameCounts.entries())
    .filter(([, data]) => data.count >= MIN_MENTIONS)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_CHARACTERS)
    .map(([name, data]) => ({ name, firstMention: data.firstMention }));
}

// --- Selection Helpers ---

/**
 * Saves the current cursor position to a ref.
 */
export function saveSelection(
  editor: Editor | null,
  ref: MutableRefObject<number | null>
) {
  if (editor && !editor.isDestroyed) {
    ref.current = editor.state.selection.from;
  }
}

/**
 * Restores the cursor position from a ref, with safety checks.
 */
export function restoreSelection(
  editor: Editor | null,
  ref: MutableRefObject<number | null>
) {
  if (editor && !editor.isDestroyed && ref.current !== null) {
    // Clamp position to valid document range to prevent errors
    const docSize = editor.state.doc.content.size;
    const safePos = Math.min(Math.max(0, ref.current), docSize);
    
    editor.commands.setTextSelection(safePos);
    editor.view.focus();
  }
}

/**
 * Finds the ProseMirror position of the first occurrence of a string.
 * This is necessary because string index != document position (due to node markup).
 */
export function findFirstOccurrence(editor: Editor, text: string): number | null {
  if (!editor || !text) return null;

  let foundPos: number | null = null;

  try {
    editor.state.doc.descendants((node, pos) => {
      if (foundPos !== null) return false; // Stop if found
      
      if (node.isText && node.text) {
        const index = node.text.indexOf(text);
        if (index !== -1) {
          foundPos = pos + index;
          return false; // Stop iteration
        }
      }
    });
  } catch (e) {
    console.warn("Error searching for text in editor:", e);
  }

  return foundPos;
}
