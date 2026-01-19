import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MarketingDashboard from "@/components/marketing/MarketingDashboard";
import { createClient } from "@/utils/supabase/client";

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn().mockResolvedValue({ data: {}, error: null }),
        then: jest.fn().mockResolvedValue({ data: {}, error: null }), // for simple await
      })),
    })),
  })),
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
    owner_user_id: "user-123",
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

    const toggle = screen.getByRole("button", { name: "" }); // The toggle button doesn't have a label in the JSX provided but it's the only one with these classes
    expect(screen.getByText("Private")).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("saves changes correctly", async () => {
    const mockUpdate = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    
    mockSupabase.from.mockReturnValue({
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue({
      eq: mockEq,
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
});
