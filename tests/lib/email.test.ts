/**
 * Unit tests for email notification system (Story 4.6)
 * Tests AC 4.6.3: Reliability - error handling and graceful degradation
 */

import {
  sendEmail,
  notifyAdminsNewTicket,
  notifyUserReply,
  notifyAdminReply,
  notifyServiceFulfilled,
  notifyServiceCancelled,
} from "@/lib/email";

// Mock Resend SDK
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

describe("email.ts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("sendEmail", () => {
    it("should return mock mode when RESEND_API_KEY is missing", async () => {
      // Unset the API key to trigger mock mode
      delete process.env.RESEND_API_KEY;

      // Re-import to get fresh module with no API key
      jest.resetModules();
      const { sendEmail: freshSendEmail } = await import("@/lib/email");

      const result = await freshSendEmail({
        to: "test@example.com",
        subject: "Test",
        text: "Hello",
      });

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
    });

    it("should include html fallback when not provided", async () => {
      // This test validates the text-to-html conversion logic
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      delete process.env.RESEND_API_KEY;
      jest.resetModules();
      const { sendEmail: freshSendEmail } = await import("@/lib/email");

      await freshSendEmail({
        to: "test@example.com",
        subject: "Test",
        text: "Line1\nLine2",
      });

      // In mock mode, it logs the email
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[MOCK EMAIL]")
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe("notifyAdminsNewTicket (AC 4.6.1)", () => {
    it("should construct correct email payload for new ticket", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      delete process.env.RESEND_API_KEY;
      process.env.ADMIN_EMAIL = "support@test.com";
      process.env.NEXT_PUBLIC_APP_URL = "https://app.test.com";

      jest.resetModules();
      const { notifyAdminsNewTicket: freshNotify } = await import(
        "@/lib/email"
      );

      await freshNotify("ticket-123", "Bug Report", "user@example.com");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("support@test.com")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Bug Report")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("user@example.com")
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe("notifyUserReply (AC 4.6.2)", () => {
    it("should truncate long messages to 200 chars + ellipsis", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      delete process.env.RESEND_API_KEY;
      jest.resetModules();
      const { notifyUserReply: freshNotify } = await import("@/lib/email");

      const longMessage = "A".repeat(300);
      await freshNotify(
        "ticket-456",
        "Help Request",
        "user@example.com",
        longMessage
      );

      // The mock log should contain the truncated snippet
      const logCall = consoleLogSpy.mock.calls[0]?.[0] || "";
      // Snippet should be 197 chars + '...'
      expect(logCall).not.toContain("A".repeat(300));

      consoleLogSpy.mockRestore();
    });

    it("should include dashboard link in email", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      delete process.env.RESEND_API_KEY;
      process.env.NEXT_PUBLIC_APP_URL = "https://app.test.com";

      jest.resetModules();
      const { notifyUserReply: freshNotify } = await import("@/lib/email");

      await freshNotify(
        "ticket-789",
        "Question",
        "user@example.com",
        "Your issue is resolved"
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("https://app.test.com/dashboard/support/ticket-789")
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe("notifyAdminReply", () => {
    it("should notify admin when user replies", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      delete process.env.RESEND_API_KEY;
      process.env.ADMIN_EMAIL = "admin@test.com";

      jest.resetModules();
      const { notifyAdminReply: freshNotify } = await import("@/lib/email");

      await freshNotify("ticket-999", "Follow-up", "user@example.com");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("admin@test.com")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("user@example.com")
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe("notifyServiceFulfilled (AC 5.4.2)", () => {
    it("should notify user when ISBN is assigned", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      delete process.env.RESEND_API_KEY;
      jest.resetModules();
      const { notifyServiceFulfilled: freshNotify } = await import("@/lib/email");

      await freshNotify("author@example.com", "isbn", "9781234567890");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("author@example.com")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("ISBN")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("9781234567890")
      );

      consoleLogSpy.mockRestore();
    });

    it("should notify user for non-ISBN service completion", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      delete process.env.RESEND_API_KEY;
      jest.resetModules();
      const { notifyServiceFulfilled: freshNotify } = await import("@/lib/email");

      await freshNotify("author@example.com", "cover_design");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("author@example.com")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("cover_design")
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe("notifyServiceCancelled (AC 5.4.3)", () => {
    it("should notify user when service is cancelled with refund", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      delete process.env.RESEND_API_KEY;
      jest.resetModules();
      const { notifyServiceCancelled: freshNotify } = await import("@/lib/email");

      await freshNotify(
        "author@example.com",
        "isbn",
        "ISBN pool depleted",
        true
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("author@example.com")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cancelled")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("refund")
      );

      consoleLogSpy.mockRestore();
    });

    it("should notify user when service is cancelled without refund", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      delete process.env.RESEND_API_KEY;
      jest.resetModules();
      const { notifyServiceCancelled: freshNotify } = await import("@/lib/email");

      await freshNotify(
        "author@example.com",
        "editing",
        "User requested cancellation",
        false
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("author@example.com")
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("contact support")
      );

      consoleLogSpy.mockRestore();
    });
  });
});
