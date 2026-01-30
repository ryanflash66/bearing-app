/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import ServiceRequestModal from "@/components/marketplace/ServiceRequestModal";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn(),
  }),
}));

// Mock TiptapEditor
type TiptapUpdate = { json: unknown };
type TiptapEditorProps = {
  onUpdate: (props: TiptapUpdate) => void;
  placeholder?: string;
  content?: unknown;
};

jest.mock("@/components/editor/TiptapEditor", () => {
  return function MockTiptapEditor({ onUpdate, placeholder }: TiptapEditorProps) {
    return (
      <textarea
        data-testid="mock-tiptap"
        placeholder={placeholder}
        onChange={(e) =>
          onUpdate({
            json: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: e.target.value }],
                },
              ],
            },
          })
        }
      />
    );
  };
});

// Mock BISAC codes
jest.mock("@/lib/bisac-codes", () => ({
  BISAC_CODES: [
    { code: "FIC000000", label: "Fiction / General" },
    { code: "FIC002000", label: "Fiction / Action & Adventure" },
  ],
}));

// Mock validation functions
jest.mock("@/lib/publication-validation", () => ({
  isValidISBN10: jest.fn((isbn: string) => isbn === "0306406152"),
  isValidISBN13: jest.fn((isbn: string) => isbn === "9780306406157"),
  cleanISBN: jest.fn((isbn: string) => isbn?.replace(/[^0-9X]/gi, "")),
}));

describe("ServiceRequestModal", () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("when closed", () => {
    it("renders nothing when isOpen is false", () => {
      const { container } = render(
        <ServiceRequestModal
          isOpen={false}
          onClose={mockOnClose}
          serviceId="author-website"
          serviceTitle="Author Website"
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("generic service form", () => {
    it("renders modal with correct title for author-website", () => {
      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="author-website"
          serviceTitle="Author Website"
        />
      );

      expect(screen.getByText("Request Author Website")).toBeInTheDocument();
      expect(screen.getByText(/Submit your request for author website/i)).toBeInTheDocument();
    });

    it("shows service-specific prompt for author-website", () => {
      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="author-website"
          serviceTitle="Author Website"
        />
      );

      expect(screen.getByText(/Tell us about your vision for your author website/i)).toBeInTheDocument();
    });

    it("renders details textarea for generic services", () => {
      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="marketing"
          serviceTitle="Marketing Package"
        />
      );

      expect(screen.getByLabelText("Request Details")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Describe your requirements...")).toBeInTheDocument();
    });

    it("calls onClose when Close button is clicked", async () => {
      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="author-website"
          serviceTitle="Author Website"
        />
      );

      const closeButton = screen.getByRole("button", { name: /Close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Cancel button is clicked", async () => {
      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="author-website"
          serviceTitle="Author Website"
        />
      );

      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("submits form with details", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, requestId: "req-123" }),
      });

      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="author-website"
          serviceTitle="Author Website"
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByPlaceholderText("Describe your requirements...");
      await userEvent.type(textarea, "I want a modern author website");

      const submitButton = screen.getByRole("button", { name: /Submit Request/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/services/request",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("publishing form", () => {
    it("renders publishing-specific fields", () => {
      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="publishing-help"
          serviceTitle="Publishing Assistance"
          manuscriptId="manu-123"
        />
      );

      // Should show publishing warning
      expect(screen.getByText(/Before you publish this book/i)).toBeInTheDocument();

      // Should show publishing-specific fields
      expect(screen.getByLabelText(/ISBN/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Keywords/i)).toBeInTheDocument();
    });

    it("shows warning banner for publishing requests", () => {
      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="publishing-help"
          serviceTitle="Publishing Assistance"
          manuscriptId="manu-123"
        />
      );

      expect(screen.getByText(/your manuscript will be sent to NGANDIWEB/i)).toBeInTheDocument();
    });

    it("does not show warning banner for non-publishing services", () => {
      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="author-website"
          serviceTitle="Author Website"
        />
      );

      expect(screen.queryByText(/your manuscript will be sent to NGANDIWEB/i)).not.toBeInTheDocument();
    });

    it("validates ISBN format", async () => {
      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="publishing-help"
          serviceTitle="Publishing Assistance"
          manuscriptId="manu-123"
        />
      );

      const isbnInput = screen.getByLabelText(/ISBN/i);
      await userEvent.type(isbnInput, "invalid-isbn-123");

      // Invalid ISBN should show error after typing enough digits
      await userEvent.type(isbnInput, "12345678901234"); // 14 digits = too long

      expect(screen.getByText(/ISBN must be 10 or 13 digits/i)).toBeInTheDocument();
    });

    it("disables submit and shows warning when no manuscriptId is provided", async () => {
      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="publishing-help"
          serviceTitle="Publishing Assistance"
          initialMetadata={{
            bisac_codes: ["FIC000000"],
            keywords: ["fantasy"],
          }}
        />
      );

      expect(
        screen.getByText(/publishing requests must be created from a manuscript/i)
      ).toBeInTheDocument();

      const submitButton = screen.getByRole("button", { name: /Submit Request/i });
      expect(submitButton).toBeDisabled();

      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("displays error message on API failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="author-website"
          serviceTitle="Author Website"
        />
      );

      const submitButton = screen.getByRole("button", { name: /Submit Request/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });

    it("handles duplicate request error (409)", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            error: "Duplicate request",
            code: "DUPLICATE_ACTIVE_REQUEST",
            existingRequestId: "existing-123",
          }),
      });

      render(
        <ServiceRequestModal
          isOpen={true}
          onClose={mockOnClose}
          serviceId="author-website"
          serviceTitle="Author Website"
          manuscriptId="manu-123"
        />
      );

      const submitButton = screen.getByRole("button", { name: /Submit Request/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/already has an active service request/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /View existing request/i })).toHaveAttribute(
          "href",
          "/dashboard/orders/existing-123"
        );
      });
    });
  });
});
