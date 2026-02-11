/**
 * Unit tests for text navigation with fuzzy matching
 * Story 8.7: Check consistency enhancement
 * AC 8.7.3 (Task 12.3): Test fuzzy match fallback triggers warning when no match
 */

import { navigateToText } from './textNavigation';
import { Editor } from '@tiptap/react';

// Mock Tiptap Editor
const createMockEditor = (content: string): Editor => {
  const mockEditor = {
    state: {
      doc: {
        textContent: content,
        content: {
          size: content.length,
        },
        nodesBetween: (_from: number, _to: number, fn: (node: any, pos: number) => void) => {
          fn({ isText: true, text: content }, 0);
        },
      },
      selection: {
        from: 0,
        to: 0,
      },
    },
    commands: {
      setTextSelection: jest.fn().mockReturnValue(true),
      scrollIntoView: jest.fn().mockReturnValue(true),
      setTemporaryHighlight: jest.fn().mockReturnValue(true),
      clearTemporaryHighlight: jest.fn().mockReturnValue(true),
    },
  } as unknown as Editor;

  return mockEditor;
};

describe('navigateToText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Primary match: case-insensitive exact substring match
  it('should find exact case-insensitive match', async () => {
    const editor = createMockEditor('This is a TEST document with some content.');
    const result = await navigateToText(editor, 'test document');

    expect(result.found).toBe(true);
    expect(result.position).toEqual({ from: 10, to: 23 });
    expect(result.warning).toBeUndefined();
    expect(editor.commands.setTextSelection).toHaveBeenCalledWith({ from: 10, to: 23 });
    expect(editor.commands.scrollIntoView).toHaveBeenCalled();
  });

  it('should find exact match with different casing', async () => {
    const editor = createMockEditor('The Quick Brown Fox jumps over the lazy dog.');
    const result = await navigateToText(editor, 'BROWN FOX');

    expect(result.found).toBe(true);
    expect(result.position?.from).toBe(10);
    expect(editor.commands.setTextSelection).toHaveBeenCalled();
  });

  // Fallback: fuzzy match with unified threshold
  it('should use fuzzy match when exact match fails (small typo)', async () => {
    const editor = createMockEditor('The quick brown fox jumps over the lazy dog.');
    // "browm" instead of "brown" (1 character difference, within threshold)
    const result = await navigateToText(editor, 'quick browm fox');

    expect(result.found).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('should apply unified fuzzy threshold: max(3, 10% of length)', async () => {
    const editor = createMockEditor('The quick brown fox jumps over the lazy dog.');

    // Test with short string (< 30 chars): threshold = 3
    // "quick brown" (11 chars) with 2 errors should match
    const result1 = await navigateToText(editor, 'quikc brwn'); // 2 typos
    expect(result1.found).toBe(true);

    // Test with longer string: threshold = 10% of length
    // "quick brown fox" (15 chars) -> threshold = max(3, 1.5) = 3
    // 3 errors should still match
    const editor2 = createMockEditor('The quick brown fox jumps over the lazy dog.');
    const result2 = await navigateToText(editor2, 'qick brwn fx'); // 3 typos
    expect(result2.found).toBe(true);
  });

  // AC 8.7.3 (Task 12.3): Fuzzy match fallback triggers warning when no match
  it('should show warning when text cannot be found (fuzzy match fails)', async () => {
    const editor = createMockEditor('This is the current document content.');
    // Completely different text that exceeds fuzzy threshold
    const result = await navigateToText(editor, 'This text has been completely changed and is very different');

    expect(result.found).toBe(false);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('Text may have changed since the check');
    expect(result.warning).toContain('This text has been completely changed and is ...');
    expect(result.position).toBeUndefined();
  });

  it('should truncate long text in warning message', async () => {
    const editor = createMockEditor('Short content.');
    const longText = 'A'.repeat(100);
    const result = await navigateToText(editor, longText);

    expect(result.found).toBe(false);
    expect(result.warning).toBeDefined();
    // Should truncate to 45 chars + "..."
    expect(result.warning?.length).toBeLessThan(100);
    expect(result.warning).toContain('...');
  });

  it('should not truncate short text in warning', async () => {
    const editor = createMockEditor('Different content.');
    const shortText = 'Missing short text';
    const result = await navigateToText(editor, shortText);

    expect(result.found).toBe(false);
    expect(result.warning).toContain(shortText);
    expect(result.warning).not.toContain('...');
  });

  // Edge cases
  it('should handle empty content', async () => {
    const editor = createMockEditor('');
    const result = await navigateToText(editor, 'some text');

    expect(result.found).toBe(false);
    expect(result.warning).toBeDefined();
  });

  it('should handle empty search text', async () => {
    const editor = createMockEditor('Some content here.');
    const result = await navigateToText(editor, '');

    // Empty string should not match
    expect(result.found).toBe(false);
  });

  it('should find text at the beginning of document', async () => {
    const editor = createMockEditor('Start of document with more content.');
    const result = await navigateToText(editor, 'Start of');

    expect(result.found).toBe(true);
    expect(result.position).toEqual({ from: 0, to: 8 });
  });

  it('should find text at the end of document', async () => {
    const editor = createMockEditor('Content with text at the end.');
    const result = await navigateToText(editor, 'the end');

    expect(result.found).toBe(true);
    expect(result.position?.to).toBe(28);
  });
});
