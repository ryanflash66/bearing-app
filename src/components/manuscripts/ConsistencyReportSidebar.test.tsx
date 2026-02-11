/**
 * Unit tests for ConsistencyReportSidebar
 * Story 8.7: Check consistency enhancement
 */

/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import DOMPurify from 'dompurify';
import ConsistencyReportSidebar from "./ConsistencyReportSidebar";

const mockReplace = jest.fn();
const searchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => searchParams,
  usePathname: () => "/manuscripts/123",
}));

// AC 8.7.9 (Task 12.1): Test XSS sanitization
describe('XSS Sanitization', () => {
  const sanitize = (text: string): string => {
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ['em', 'strong', 'code', 'mark'],
      ALLOWED_ATTR: [],
    });
  };

  it('should strip script tags', () => {
    const malicious = '<script>alert("XSS")</script>Hello';
    const sanitized = sanitize(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toBe('Hello');
  });

  it('should strip img onerror handlers', () => {
    const malicious = '<img src="x" onerror="alert(\'XSS\')">Hello';
    const sanitized = sanitize(malicious);
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).not.toContain('<img');
  });

  it('should strip javascript: URIs in links', () => {
    const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>';
    const sanitized = sanitize(malicious);
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('alert');
    // Link tag is not in ALLOWED_TAGS, so it should be stripped
    expect(sanitized).toBe('Click');
  });

  it('should strip data URIs', () => {
    const malicious = '<img src="data:text/html,<script>alert(\'XSS\')</script>">';
    const sanitized = sanitize(malicious);
    expect(sanitized).not.toContain('data:');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toBe('');
  });

  it('should preserve <em> tags', () => {
    const safe = '<em>emphasis</em>';
    const sanitized = sanitize(safe);
    expect(sanitized).toBe('<em>emphasis</em>');
  });

  it('should preserve <strong> tags', () => {
    const safe = '<strong>bold</strong>';
    const sanitized = sanitize(safe);
    expect(sanitized).toBe('<strong>bold</strong>');
  });

  it('should preserve <code> tags', () => {
    const safe = '<code>code</code>';
    const sanitized = sanitize(safe);
    expect(sanitized).toBe('<code>code</code>');
  });

  it('should preserve <mark> tags', () => {
    const safe = '<mark>highlighted</mark>';
    const sanitized = sanitize(safe);
    expect(sanitized).toBe('<mark>highlighted</mark>');
  });

  it('should strip attributes from safe tags', () => {
    const withAttrs = '<em class="danger" id="test">emphasis</em>';
    const sanitized = sanitize(withAttrs);
    // Attributes should be stripped, but tag preserved
    expect(sanitized).toBe('<em>emphasis</em>');
  });

  it('should handle mixed safe and dangerous content', () => {
    const mixed = '<em>Safe</em><script>alert("XSS")</script><strong>Also safe</strong>';
    const sanitized = sanitize(mixed);
    expect(sanitized).toBe('<em>Safe</em><strong>Also safe</strong>');
    expect(sanitized).not.toContain('<script>');
  });
});

describe("Apply Fix behavior (Story 8.7)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchParams.delete("severity");
    searchParams.delete("type");
  });

  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    isRunning: false,
    onCancel: jest.fn(),
    editor: null,
    onNavigateToIssue: jest.fn().mockResolvedValue({ found: true }),
  };

  const report = {
    issues: [
      {
        type: "grammar" as const,
        severity: "high" as const,
        location: { quote: "bad text", offset: 0 },
        explanation: "Fix this.",
        suggestion: "good text",
      },
    ],
  };

  it("disables Apply Fix during save and re-enables after save completes (Task 12.5)", async () => {
    const user = userEvent.setup();

    const onApplyFix = jest.fn().mockResolvedValue(undefined);

    let resolveSave: (value: boolean) => void;
    const savePromise = new Promise<boolean>((resolve) => {
      resolveSave = resolve;
    });

    const onSaveNow = jest.fn().mockReturnValue(savePromise);

    render(
      <ConsistencyReportSidebar
        {...baseProps}
        report={report as any}
        onApplyFix={onApplyFix}
        onSaveNow={onSaveNow}
      />,
    );

    const apply = await screen.findByRole("button", { name: /apply fix/i });
    expect(apply).toBeEnabled();

    await user.click(apply);

    expect(onApplyFix).toHaveBeenCalledTimes(1);
    expect(onSaveNow).toHaveBeenCalledTimes(1);

    expect(screen.getByRole("button", { name: /applying/i })).toBeDisabled();

    resolveSave!(true);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /apply fix/i })).toBeEnabled();
    });
  });

  it("blocks rapid Apply Fix clicks while applying (Task 12.6)", async () => {
    const user = userEvent.setup();

    const onApplyFix = jest.fn().mockResolvedValue(undefined);

    let resolveSave: (value: boolean) => void;
    const savePromise = new Promise<boolean>((resolve) => {
      resolveSave = resolve;
    });

    const onSaveNow = jest.fn().mockReturnValue(savePromise);

    render(
      <ConsistencyReportSidebar
        {...baseProps}
        report={report as any}
        onApplyFix={onApplyFix}
        onSaveNow={onSaveNow}
      />,
    );

    const apply = await screen.findByRole("button", { name: /apply fix/i });

    await user.click(apply);
    await user.click(apply);

    expect(onApplyFix).toHaveBeenCalledTimes(1);
    expect(onSaveNow).toHaveBeenCalledTimes(1);

    resolveSave!(true);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /apply fix/i })).toBeEnabled();
    });
  });
});
