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
  const mockUserId = "user-123";
  const mockSupabase = {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  };

  function mockSingleManuscript(
    data: { id: string; title: string; metadata?: object },
    userProfile?: { display_name?: string | null; pen_name?: string | null }
  ) {
    // Branch on table name for more robust mocking
    mockSupabase.from.mockImplementation((tableName: string) => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          if (tableName === "manuscripts") {
            return Promise.resolve({ data, error: null });
          } else if (tableName === "users") {
            return Promise.resolve({
              data: userProfile ?? { display_name: null, pen_name: null },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };
      return mockQuery;
    });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });
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

  it("falls back to API display name in marketplace context when no prop provided", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          manuscripts: [
            { id: "ms-1", title: "My Book", metadata: {} },
          ],
          userDisplayName: "API Display Name",
        }),
    });
    (global.fetch as jest.Mock) = mockFetch;

    render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Wait for manuscripts to load
    await waitFor(() => {
      expect(screen.getByText("My Book")).toBeInTheDocument();
    });

    // Select the manuscript
    await userEvent.selectOptions(screen.getByLabelText(/Manuscript/i), "ms-1");

    // Author name should be prefilled from API display name
    await waitFor(() => {
      expect(screen.getByDisplayValue("API Display Name")).toBeInTheDocument();
    });
  });

  it("does not show 'No manuscripts found' while loading", async () => {
    // Use a fetch that never resolves to keep loading state active
    const neverResolve = new Promise(() => {});
    const mockFetch = jest.fn().mockReturnValue(neverResolve);
    (global.fetch as jest.Mock) = mockFetch;

    render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // The "No manuscripts found" warning should NOT appear during loading
    expect(screen.queryByText(/No manuscripts found/i)).not.toBeInTheDocument();
  });

  it("shows 'No manuscripts found' after loading completes with empty results", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          manuscripts: [],
          userDisplayName: null,
        }),
    });
    (global.fetch as jest.Mock) = mockFetch;

    render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No manuscripts found/i)).toBeInTheDocument();
    });
  });

  it("prefills author from metadata even when no display name available", async () => {
    mockSingleManuscript({
      id: manuscriptId,
      title: "Titled Book",
      metadata: {
        author_name: "Metadata Author",
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
      expect(screen.getByDisplayValue("Metadata Author")).toBeInTheDocument();
    });
  });

  it("does not overwrite user-typed author name when API display name resolves later", async () => {
    // Create a deferred promise so we control when fetch resolves
    let resolveFetch!: (value: Response) => void;
    const deferredFetch = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    (global.fetch as jest.Mock) = jest.fn().mockReturnValue(deferredFetch);

    const { rerender } = render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Resolve the fetch with manuscripts but NO display name yet
    resolveFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          manuscripts: [
            { id: "ms-1", title: "My Book", metadata: {} },
          ],
          userDisplayName: null,
        }),
    } as Response);

    // Wait for manuscripts to load
    await waitFor(() => {
      expect(screen.getByText("My Book")).toBeInTheDocument();
    });

    // Select the manuscript
    await userEvent.selectOptions(screen.getByLabelText(/Manuscript/i), "ms-1");

    // Type a custom author name (author should be empty since no display name and no metadata)
    const authorInput = screen.getByLabelText(/Author Name/i) as HTMLInputElement;
    await userEvent.type(authorInput, "My Custom Author");
    expect(authorInput.value).toBe("My Custom Author");

    // Now simulate the parent providing a display name prop (e.g., async profile load)
    rerender(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        userDisplayName="Late Display Name"
      />
    );

    // The user-typed value should be preserved, not overwritten by the late display name
    await waitFor(() => {
      expect(authorInput.value).toBe("My Custom Author");
    });
  });

  it("leaves author empty when no metadata and no display name", async () => {
    mockSingleManuscript(
      { id: manuscriptId, title: "No Author Book", metadata: {} },
      { display_name: null, pen_name: null }
    );

    render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        manuscriptId={manuscriptId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No Author Book")).toBeInTheDocument();
    });

    const authorInput = screen.getByLabelText(/Author Name/i) as HTMLInputElement;
    expect(authorInput.value).toBe("");
  });

  it("falls back to pen_name when display_name is null", async () => {
    mockSingleManuscript(
      { id: manuscriptId, title: "Pen Name Book", metadata: {} },
      { display_name: null, pen_name: "Author Pen Name" }
    );

    render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        manuscriptId={manuscriptId}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Author Pen Name")).toBeInTheDocument();
    });
  });

  it("prefers display_name over pen_name when both are present", async () => {
    mockSingleManuscript(
      { id: manuscriptId, title: "Display Name Book", metadata: {} },
      { display_name: "Display Name", pen_name: "Pen Name" }
    );

    render(
      <IsbnRegistrationModal
        isOpen={true}
        onClose={mockOnClose}
        manuscriptId={manuscriptId}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Display Name")).toBeInTheDocument();
    });
  });
});
