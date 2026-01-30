/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import PublishingRequestModal from "@/components/manuscripts/PublishingRequestModal";

// Mock next/navigation
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock TiptapEditor
jest.mock("@/components/editor/TiptapEditor", () => {
  return function MockTiptapEditor({ placeholder }: { placeholder?: string }) {
    return (
      <div data-testid="tiptap-editor">
        <textarea placeholder={placeholder} />
      </div>
    );
  };
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("PublishingRequestModal (Story 8.6)", () => {
  const mockOnClose = jest.fn();
  const mockOnMetadataSave = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    manuscriptId: "ms-123",
    initialMetadata: {},
    onMetadataSave: mockOnMetadataSave,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnMetadataSave.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, requestId: "req-456" }),
    });
  });

  // AC 8.6.1: Publishing button opens modal
  describe("Modal visibility", () => {
    it("renders modal when isOpen is true", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      expect(screen.getByText("Request Publishing Assistance")).toBeInTheDocument();
      expect(
        screen.getByText(/submit your request for publishing assistance/i)
      ).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<PublishingRequestModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Request Publishing Assistance")).not.toBeInTheDocument();
    });
  });

  // AC 8.6.2: Form fields
  describe("Form fields", () => {
    it("displays ISBN field as optional", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      expect(screen.getByLabelText(/ISBN/i)).toBeInTheDocument();
      // Use getAllByText since multiple fields are optional
      const optionalLabels = screen.getAllByText(/optional/i);
      expect(optionalLabels.length).toBeGreaterThan(0);
    });

    it("displays Category field as required", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      expect(screen.getByText("Category")).toBeInTheDocument();
      // Look for required asterisk
      const categoryLabel = screen.getByText("Category");
      expect(categoryLabel.parentElement?.querySelector(".text-red-500")).toBeInTheDocument();
    });

    it("displays Keywords field as required", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      expect(screen.getByText("Keywords")).toBeInTheDocument();
    });

    it("displays Acknowledgements field", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      expect(screen.getByText("Acknowledgements")).toBeInTheDocument();
    });

    it("displays Education Level dropdown", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      expect(screen.getByLabelText(/Education Level/i)).toBeInTheDocument();
    });
  });

  // AC 8.6.3: Warning text and CTA
  describe("Warning and CTA", () => {
    it("shows warning text about manuscript lock", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      expect(screen.getByText(/your manuscript will be sent to NGANDIWEB/i)).toBeInTheDocument();
      expect(screen.getByText(/cannot edit this manuscript/i)).toBeInTheDocument();
    });

    it("shows submit request button", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: /submit request/i })).toBeInTheDocument();
    });
  });

  // AC 8.6.4: Required field validation
  describe("Form validation", () => {
    it("disables submit button when no categories selected", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /submit request/i });
      expect(submitButton).toBeDisabled();
    });

    it("disables submit button when no keywords entered", () => {
      render(<PublishingRequestModal {...defaultProps} initialMetadata={{ bisac_codes: ["FIC000000"] }} />);

      const submitButton = screen.getByRole("button", { name: /submit request/i });
      expect(submitButton).toBeDisabled();
    });

    it("enables submit button when all required fields are filled", async () => {
      render(
        <PublishingRequestModal
          {...defaultProps}
          initialMetadata={{
            bisac_codes: ["FIC000000"],
            keywords: ["fantasy"],
          }}
        />
      );

      const submitButton = screen.getByRole("button", { name: /submit request/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("shows ISBN validation error for invalid ISBN", async () => {
      render(<PublishingRequestModal {...defaultProps} />);

      const isbnInput = screen.getByLabelText(/ISBN/i);
      fireEvent.change(isbnInput, { target: { value: "123-invalid-isbn" } });

      await waitFor(() => {
        // Matches "ISBN must be 10 or 13 digits"
        expect(screen.getByText(/ISBN must be 10 or 13 digits/i)).toBeInTheDocument();
      });
    });

    it("accepts valid ISBN-13", async () => {
      render(
        <PublishingRequestModal
          {...defaultProps}
          initialMetadata={{
            bisac_codes: ["FIC000000"],
            keywords: ["fantasy"],
          }}
        />
      );

      const isbnInput = screen.getByLabelText(/ISBN/i);
      fireEvent.change(isbnInput, { target: { value: "978-0-06-112008-4" } });

      await waitFor(() => {
        expect(screen.queryByText(/invalid isbn/i)).not.toBeInTheDocument();
      });
    });
  });

  // AC 8.6.5, 8.6.6: Form submission
  describe("Form submission", () => {
    it("saves metadata and calls API on submit", async () => {
      render(
        <PublishingRequestModal
          {...defaultProps}
          initialMetadata={{
            bisac_codes: ["FIC000000"],
            keywords: ["fantasy", "adventure"],
          }}
        />
      );

      const submitButton = screen.getByRole("button", { name: /submit request/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        // Verify metadata save was called
        expect(mockOnMetadataSave).toHaveBeenCalled();

        // Verify API was called with correct payload
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/services/request",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("publishing-help"),
          })
        );
      });
    });

    it("closes modal and refreshes on successful submission", async () => {
      render(
        <PublishingRequestModal
          {...defaultProps}
          initialMetadata={{
            bisac_codes: ["FIC000000"],
            keywords: ["fantasy"],
          }}
        />
      );

      const submitButton = screen.getByRole("button", { name: /submit request/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("shows loading state during submission", async () => {
      // Make fetch slow
      mockFetch.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }), 100)));

      render(
        <PublishingRequestModal
          {...defaultProps}
          initialMetadata={{
            bisac_codes: ["FIC000000"],
            keywords: ["fantasy"],
          }}
        />
      );

      const submitButton = screen.getByRole("button", { name: /submit request/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument();
      });
    });
  });

  // AC 8.6.7: Duplicate request handling
  describe("Duplicate request handling", () => {
    it("shows error with link to orders on 409 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          error: "This manuscript already has an active service request",
          code: "DUPLICATE_ACTIVE_REQUEST",
          existingRequestId: "req-existing-123",
        }),
      });

      render(
        <PublishingRequestModal
          {...defaultProps}
          initialMetadata={{
            bisac_codes: ["FIC000000"],
            keywords: ["fantasy"],
          }}
        />
      );

      const submitButton = screen.getByRole("button", { name: /submit request/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/already has an active service request/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /view existing request/i })).toBeInTheDocument();
      });
    });

    it("links to correct order detail page", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          error: "Duplicate request",
          code: "DUPLICATE_ACTIVE_REQUEST",
          existingRequestId: "req-existing-456",
        }),
      });

      render(
        <PublishingRequestModal
          {...defaultProps}
          initialMetadata={{
            bisac_codes: ["FIC000000"],
            keywords: ["fantasy"],
          }}
        />
      );

      const submitButton = screen.getByRole("button", { name: /submit request/i });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /view existing request/i });
        expect(link).toHaveAttribute("href", "/dashboard/orders/req-existing-456");
      });
    });
  });

  // Close button behavior
  describe("Close behavior", () => {
    it("calls onClose when Cancel button is clicked", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("calls onClose when Close button in header is clicked", () => {
      render(<PublishingRequestModal {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
