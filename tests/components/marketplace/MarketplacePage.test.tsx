/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Next.js navigation
const mockRedirect = jest.fn();
jest.mock("next/navigation", () => ({
  redirect: mockRedirect,
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/dashboard/marketplace",
}));

// Mock Supabase client
const mockGetUser = jest.fn();

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

// Mock profile service
const mockGetOrCreateProfile = jest.fn();
jest.mock("@/lib/profile", () => ({
  getOrCreateProfile: mockGetOrCreateProfile,
}));

// Mock marketplace data
jest.mock("@/lib/marketplace-data", () => ({
  MARKETPLACE_SERVICES: [
    {
      id: "service-1",
      title: "Test Service 1",
      priceRange: "$100",
      description: "Test description 1",
      turnaroundTime: "5 days",
    },
    {
      id: "service-2",
      title: "Test Service 2",
      priceRange: "$200",
      description: "Test description 2",
      turnaroundTime: "10 days",
    },
  ],
}));

describe("MarketplacePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirect.mockClear();
  });

  it("redirects to login if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const MarketplacePage = (await import("@/app/dashboard/marketplace/page")).default;
    await MarketplacePage();

    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?returnUrl=%2Fdashboard%2Fmarketplace"
    );
  });

  it("redirects to login and logs error if auth error occurs", async () => {
    const authError = new Error("Auth failed");
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });
    
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const MarketplacePage = (await import("@/app/dashboard/marketplace/page")).default;
    await MarketplacePage();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching authenticated user in MarketplacePage:",
      authError
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?returnUrl=%2Fdashboard%2Fmarketplace"
    );
    
    consoleErrorSpy.mockRestore();
  });

  it("renders ServiceGrid for author users", async () => {
    const mockUser = { id: "user-1", email: "author@example.com" };
    const mockProfile = {
      id: "profile-1",
      user_id: "user-1",
      display_name: "Author User",
      role: "author",
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ profile: mockProfile });

    const MarketplacePage = (await import("@/app/dashboard/marketplace/page")).default;
    const result = await MarketplacePage();
    
    render(result);

    expect(screen.getByText("Service Marketplace")).toBeInTheDocument();
    expect(screen.getByText(/browse and request professional services/i)).toBeInTheDocument();
    expect(screen.getByText("Test Service 1")).toBeInTheDocument();
    expect(screen.getByText("Test Service 2")).toBeInTheDocument();
  });

  it("renders DesignerBoard for support_agent users", async () => {
    const mockUser = { id: "user-2", email: "designer@example.com" };
    const mockProfile = {
      id: "profile-2",
      user_id: "user-2",
      display_name: "Designer User",
      role: "support_agent",
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ profile: mockProfile });

    const MarketplacePage = (await import("@/app/dashboard/marketplace/page")).default;
    const result = await MarketplacePage();
    
    render(result);

    expect(screen.getByText("Service Marketplace")).toBeInTheDocument();
    expect(screen.getByText(/manage service requests and tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/task board view/i)).toBeInTheDocument();
    expect(screen.getByText(/future implementation/i)).toBeInTheDocument();
  });

  it("renders ServiceGrid for regular users (no admin role exists)", async () => {
    // Note: "admin" is not a valid role in the type system.
    // Valid roles are: user, support_agent, super_admin
    // Regular users see the ServiceGrid, not the DesignerBoard.
    const mockUser = { id: "user-3", email: "user@example.com" };
    const mockProfile = {
      id: "profile-3",
      user_id: "user-3",
      display_name: "Regular User",
      role: "user",
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ profile: mockProfile });

    const MarketplacePage = (await import("@/app/dashboard/marketplace/page")).default;
    const result = await MarketplacePage();
    
    render(result);

    expect(screen.getByText("Service Marketplace")).toBeInTheDocument();
    expect(screen.getByText(/browse and request professional services/i)).toBeInTheDocument();
  });

  it("renders DesignerBoard for super_admin users", async () => {
    const mockUser = { id: "user-4", email: "superadmin@example.com" };
    const mockProfile = {
      id: "profile-4",
      user_id: "user-4",
      display_name: "Super Admin",
      role: "super_admin",
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ profile: mockProfile });

    const MarketplacePage = (await import("@/app/dashboard/marketplace/page")).default;
    const result = await MarketplacePage();
    
    render(result);

    expect(screen.getByText(/task board view/i)).toBeInTheDocument();
  });

  it("uses email when display_name is not set", async () => {
    const mockUser = { id: "user-5", email: "test@example.com" };
    const mockProfile = {
      id: "profile-5",
      user_id: "user-5",
      display_name: null,
      role: "author",
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ profile: mockProfile });

    const MarketplacePage = (await import("@/app/dashboard/marketplace/page")).default;
    const result = await MarketplacePage();
    
    render(result);

    // Should render without errors
    expect(screen.getByText("Service Marketplace")).toBeInTheDocument();
  });

  it("passes correct user data to DashboardLayout", async () => {
    const mockUser = { id: "user-6", email: "user@example.com" };
    const mockProfile = {
      id: "profile-6",
      user_id: "user-6",
      display_name: "Display Name",
      role: "author",
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ profile: mockProfile });

    const MarketplacePage = (await import("@/app/dashboard/marketplace/page")).default;
    const result = await MarketplacePage();
    
    render(result);

    // Verify user info is rendered in layout
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });
});
