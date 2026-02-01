/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import IsbnRegistrationModal from "@/components/marketplace/IsbnRegistrationModal";
import { createClient } from "@/utils/supabase/client";
import { navigateTo } from "@/lib/navigation";

jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/navigation", () => ({
  navigateTo: jest.fn(),
}));

jest.mock("@/lib/bisac-codes", () => ({
  BISAC_CODES: [
    { code: "FIC000000", label: "Fiction / General" },
    { code: "FIC002000", label: "Fiction / Action & Adventure" },
  ],
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("IsbnRegistrationModal", () => {
  const mockOnClose = jest.fn();
  const manuscriptId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const mockSupabase = {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  };

  function mockSingleManuscript(data: { id: string; title: string; metadata?: object }) {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (global.fetch as jest.Mock) = jest.fn();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <IsbnRegistrationModal isOpen={false} onClose={mockOnClose} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("prefills author name and category from manuscript metadata", async () => {
    mockSingleManuscript({
      id: manuscriptId,
      title: "Test Manuscript",
      metadata: {
        author_name: "Jane Doe",
        bisac_codes: ["FIC000000"],
      },
    });

    render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        manuscriptId={manuscriptId}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    });

    expect(screen.getByText("Test Manuscript")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("FIC000000 - Fiction / General")
    ).toBeInTheDocument();
  });

  it("falls back to user display name when manuscript metadata is missing", async () => {
    mockSingleManuscript({
      id: manuscriptId,
      title: "Untitled",
      metadata: {},
    });

    render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        manuscriptId={manuscriptId}
        userDisplayName="Fallback Author"
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Fallback Author")).toBeInTheDocument();
    });

    const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
    expect(categorySelect.value).toBe("");
  });

  it("submits valid payload and redirects on success", async () => {
    mockSingleManuscript({
      id: manuscriptId,
      title: "Test Manuscript",
      metadata: {},
    });

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          url: "https://checkout.stripe.com/pay/cs_test",
          poolWarning: false,
        }),
    });
    (global.fetch as jest.Mock) = mockFetch;

    render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        manuscriptId={manuscriptId}
      />
    );

    const submitButton = screen.getByRole("button", { name: /buy isbn/i });
    expect(submitButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Author Name/i), "Jane Author");
    await userEvent.selectOptions(screen.getByLabelText(/Category/i), "FIC000000");

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/checkout/isbn",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manuscriptId,
            metadata: {
              author_name: "Jane Author",
              bisac_code: "FIC000000",
            },
          }),
        })
      );
    });

    expect(navigateTo).toHaveBeenCalledWith(
      "https://checkout.stripe.com/pay/cs_test"
    );
  });

  it("shows duplicate request message and order link on 409", async () => {
    mockSingleManuscript({
      id: manuscriptId,
      title: "Test Manuscript",
      metadata: {},
    });

    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          error: "Duplicate request",
          code: "DUPLICATE_ACTIVE_REQUEST",
          existingRequestId: "existing-123",
        }),
    });
    (global.fetch as jest.Mock) = mockFetch;

    render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        manuscriptId={manuscriptId}
      />
    );

    await userEvent.type(screen.getByLabelText(/Author Name/i), "Jane Author");
    await userEvent.selectOptions(screen.getByLabelText(/Category/i), "FIC000000");

    const submitButton = screen.getByRole("button", { name: /buy isbn/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/already has an active ISBN request/i)
      ).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /View existing order/i });
    expect(link).toHaveAttribute("href", "/dashboard/orders/existing-123");
  });
});
