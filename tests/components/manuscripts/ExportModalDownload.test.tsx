/**
 * Tests for ExportModal download functionality (Story 8.1)
 *
 * AC 8.1.1: PDF Export Download Success
 * AC 8.1.2: DOCX Export Download Success
 * AC 8.1.3: Error Handling and User Feedback
 * AC 8.1.4: Response Headers and CORS Compliance
 */

// Test the utility functions that will be extracted from ExportModal
import {
  parseFilenameFromContentDisposition,
  createDownloadFromBlob,
  mapHttpStatusToMessage,
  validateExportResponse,
} from "@/lib/export-download-utils";

describe("ExportModal Download Utilities (Story 8.1)", () => {
  describe("AC 8.1.4: parseFilenameFromContentDisposition", () => {
    it("should parse basic filename from Content-Disposition header", () => {
      const header = 'attachment; filename="my-manuscript.pdf"';
      expect(parseFilenameFromContentDisposition(header, "fallback.pdf")).toBe(
        "my-manuscript.pdf"
      );
    });

    it("should parse RFC 5987 encoded filename (filename*)", () => {
      // UTF-8 encoded filename: "Mein Buch.pdf" (German: My Book)
      const header =
        "attachment; filename=\"fallback.pdf\"; filename*=UTF-8''Mein%20Buch.pdf";
      expect(parseFilenameFromContentDisposition(header, "default.pdf")).toBe(
        "Mein Buch.pdf"
      );
    });

    it("should prefer filename* over filename when both present", () => {
      const header =
        "attachment; filename=\"ascii-name.pdf\"; filename*=UTF-8''%E4%B8%AD%E6%96%87.pdf";
      expect(parseFilenameFromContentDisposition(header, "default.pdf")).toBe(
        "中文.pdf"
      );
    });

    it("should return fallback when header is null", () => {
      expect(parseFilenameFromContentDisposition(null, "fallback.pdf")).toBe(
        "fallback.pdf"
      );
    });

    it("should return fallback when no filename found in header", () => {
      const header = "attachment";
      expect(parseFilenameFromContentDisposition(header, "fallback.pdf")).toBe(
        "fallback.pdf"
      );
    });

    it("should handle filenames with special characters", () => {
      const header =
        "attachment; filename*=UTF-8''My%20Book%20%28Final%29.pdf";
      expect(parseFilenameFromContentDisposition(header, "default.pdf")).toBe(
        "My Book (Final).pdf"
      );
    });

    it("should handle unquoted filename", () => {
      const header = "attachment; filename=simple.pdf";
      expect(parseFilenameFromContentDisposition(header, "fallback.pdf")).toBe(
        "simple.pdf"
      );
    });
  });

  describe("AC 8.1.3: mapHttpStatusToMessage", () => {
    it("should return auth message for 401", () => {
      expect(mapHttpStatusToMessage(401)).toBe(
        "Please log in to export your manuscript"
      );
    });

    it("should return permission message for 403", () => {
      expect(mapHttpStatusToMessage(403)).toBe(
        "You don't have permission to export this manuscript"
      );
    });

    it("should return not found message for 404", () => {
      expect(mapHttpStatusToMessage(404)).toBe("Manuscript not found");
    });

    it("should return server error message for 500", () => {
      expect(mapHttpStatusToMessage(500)).toBe(
        "Server error. Please try again or contact support"
      );
    });

    it("should return generic message for unknown status", () => {
      expect(mapHttpStatusToMessage(418)).toBe(
        "Export failed (Error 418). Please try again"
      );
    });
  });

  describe("AC 8.1.1, 8.1.2: validateExportResponse", () => {
    it("should return error for opaque response", () => {
      const mockResponse = {
        ok: true,
        type: "opaque",
        status: 200,
      } as Response;

      const result = validateExportResponse(mockResponse);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("CORS");
    });

    it("should return error for non-ok response", () => {
      const mockResponse = {
        ok: false,
        type: "cors",
        status: 401,
      } as Response;

      const result = validateExportResponse(mockResponse);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please log in to export your manuscript");
    });

    it("should return valid for successful response", () => {
      const mockResponse = {
        ok: true,
        type: "cors",
        status: 200,
      } as Response;

      const result = validateExportResponse(mockResponse);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it("should return valid for basic response type", () => {
      const mockResponse = {
        ok: true,
        type: "basic",
        status: 200,
      } as Response;

      const result = validateExportResponse(mockResponse);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe("AC 8.1.1, 8.1.2: createDownloadFromBlob", () => {
    // Mock browser APIs
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;
    let mockObjectURL: string;

    beforeEach(() => {
      mockObjectURL = "blob:test-url";
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = jest.fn().mockReturnValue(mockObjectURL);
      URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it("should return error for empty blob", async () => {
      const emptyBlob = new Blob([], { type: "application/pdf" });

      const result = await createDownloadFromBlob(emptyBlob, "test.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("should return error for incorrect MIME type", async () => {
      const blob = new Blob(["content"], { type: "text/html" });

      const result = await createDownloadFromBlob(blob, "test.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("unexpected format");
    });

    it("should accept application/pdf MIME type for PDF", async () => {
      const blob = new Blob(["pdf content"], { type: "application/pdf" });

      const result = await createDownloadFromBlob(blob, "test.pdf");

      expect(result.success).toBe(true);
    });

    it("should accept DOCX MIME type for DOCX", async () => {
      const blob = new Blob(["docx content"], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const result = await createDownloadFromBlob(blob, "test.docx");

      expect(result.success).toBe(true);
    });

    it("should accept octet-stream as fallback MIME type", async () => {
      const blob = new Blob(["content"], { type: "application/octet-stream" });

      const result = await createDownloadFromBlob(blob, "test.pdf");

      expect(result.success).toBe(true);
    });

    it("should clean up object URL after download", async () => {
      jest.useFakeTimers();
      const blob = new Blob(["pdf content"], { type: "application/pdf" });

      await createDownloadFromBlob(blob, "test.pdf");

      // Advance timers to trigger cleanup
      jest.advanceTimersByTime(100);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockObjectURL);
      jest.useRealTimers();
    });
  });
});
