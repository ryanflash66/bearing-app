import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MarketingDashboard from "@/components/marketing/MarketingDashboard";
import { createClient } from "@/utils/supabase/client";

// Mock Supabase
const mockEq = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn(() => ({
  eq: mockEq,
}));
const mockSupabase = {
  from: jest.fn((table: string) => {
    if (table === "cover_jobs") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      };
    }

    return {
      update: mockUpdate,
    };
  }),
};

jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    refresh: jest.fn(),
  })),
}));

describe("MarketingDashboard", () => {
  const mockManuscript = {
    id: "manuscript-123",
    title: "Test Book",
    slug: "test-book",
    is_public: false,
    subtitle: "A subtitle",
    synopsis: "A synopsis",
    cover_image_url: null,
    metadata: {},
    owner_user_id: "user-123",
    theme_config: null,
  };

  const mockSignups = [
    { id: "1", email: "fan@example.com", created_at: "2026-01-01T00:00:00Z", source: "landing_page" },
  ];
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it("renders dashboard with correct link", () => {
    render(
      <MarketingDashboard
        manuscript={mockManuscript}
        signups={mockSignups}
        userHandle="authorhandle"
      />
    );

    expect(screen.getByText(/Test Book/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("test-book")).toBeInTheDocument();
    // Link format: /authorhandle/test-book
    expect(screen.getByText(/authorhandle\/test-book/i)).toBeInTheDocument();
  });

  it("displays signups list", () => {
    render(
      <MarketingDashboard
        manuscript={mockManuscript}
        signups={mockSignups}
        userHandle="authorhandle"
      />
    );

    expect(screen.getByText("fan@example.com")).toBeInTheDocument();
  });

  it("toggles public visibility", async () => {
    render(
      <MarketingDashboard
        manuscript={mockManuscript}
        signups={mockSignups}
        userHandle="authorhandle"
      />
    );

    const toggle = screen.getByRole("button", { name: /toggle public visibility/i });
    expect(screen.getByText("Private")).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("saves changes correctly", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "cover_jobs") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return { update: mockUpdate };
    });

    render(
      <MarketingDashboard
        manuscript={mockManuscript}
        signups={mockSignups}
        userHandle="authorhandle"
      />
    );

    // Update subtitle
    const subtitleInput = screen.getByPlaceholderText(/A compelling subtitle/i);
    fireEvent.change(subtitleInput, { target: { value: "New Subtitle" } });

    // Click save
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Saved successfully!/i)).toBeInTheDocument();
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("manuscripts");
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      subtitle: "New Subtitle",
      is_public: false,
    }));
  });

  it("switches to Cover Lab tab", () => {
    render(
      <MarketingDashboard
        manuscript={mockManuscript as any}
        signups={mockSignups}
        userHandle="authorhandle"
      />
    );

    const coverLabTab = screen.getByRole("button", { name: "Cover Lab" });
    fireEvent.click(coverLabTab);

    expect(screen.getByText("Generate AI cover concepts from your manuscript metadata and visual description.")).toBeInTheDocument();
  });

  it("handles save errors", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "cover_jobs") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: { message: "Update failed" } }),
        })),
      };
    });

    render(
      <MarketingDashboard
        manuscript={mockManuscript}
        signups={mockSignups}
        userHandle="authorhandle"
      />
    );

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to save:/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Update failed/i)).toBeInTheDocument();
  });
});
