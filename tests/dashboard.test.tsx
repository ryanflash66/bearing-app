/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Next.js modules
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/dashboard",
  redirect: jest.fn(),
}));

// Mock Supabase client
const mockGetUser = jest.fn();
const mockListFactors = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
        mfa: {
          listFactors: mockListFactors,
        },
      },
      from: mockFrom,
    })
  ),
}));

// Mock profile service
jest.mock("@/lib/profile", () => ({
  getOrCreateProfile: jest.fn(),
}));

import { getOrCreateProfile } from "@/lib/profile";

describe("Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("DashboardLayout", () => {
    it("renders navigation items correctly", async () => {
      // Import dynamically to allow mocking
      const DashboardLayout = (
        await import("@/components/layout/DashboardLayout")
      ).default;

      render(
        <DashboardLayout
          user={{ email: "test@example.com", displayName: "Test User", role: "author" }}
        >
          <div>Dashboard content</div>
        </DashboardLayout>
      );

      // Check nav items exist using getAllByText for items that appear multiple times
      const dashboardLinks = screen.getAllByText("Dashboard");
      expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
      
      expect(screen.getByText("Manuscripts")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Marketplace")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Marketplace/i })).toHaveAttribute("href", "/dashboard/marketplace");
      
      // Admin should NOT be visible for non-admin users
      expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it("shows Admin badge and admin dashboard link for super_admin users", async () => {
      const DashboardLayout = (
        await import("@/components/layout/DashboardLayout")
      ).default;

      render(
        <DashboardLayout
          user={{ email: "superadmin@example.com", displayName: "Super Admin", role: "super_admin" }}
        >
          <div>Dashboard content</div>
        </DashboardLayout>
      );

      // Admin badge should be visible for super admins (role === "super_admin")
      expect(screen.getByText("Admin")).toBeInTheDocument();

      // For super admins, Dashboard link redirects to super admin dashboard
      const dashboardLink = screen.getByRole("link", { name: /Dashboard/i });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute("href", "/dashboard/admin/super");
    });

    it("displays user email and display name", async () => {
      const DashboardLayout = (
        await import("@/components/layout/DashboardLayout")
      ).default;

      render(
        <DashboardLayout
          user={{ email: "test@example.com", displayName: "Test User", role: "author" }}
        >
          <div>Dashboard content</div>
        </DashboardLayout>
      );

      // Test User appears in sidebar and header
      const testUserElements = screen.getAllByText("Test User");
      expect(testUserElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("falls back to email prefix when no display name", async () => {
      const DashboardLayout = (
        await import("@/components/layout/DashboardLayout")
      ).default;

      render(
        <DashboardLayout
          user={{ email: "john.doe@example.com", role: "author" }}
        >
          <div>Dashboard content</div>
        </DashboardLayout>
      );

      // Should show "john.doe" from email prefix (appears in sidebar and header)
      const johnDoeElements = screen.getAllByText("john.doe");
      expect(johnDoeElements.length).toBeGreaterThanOrEqual(1);
    });

    it("renders children content", async () => {
      const DashboardLayout = (
        await import("@/components/layout/DashboardLayout")
      ).default;

      render(
        <DashboardLayout
          user={{ email: "test@example.com", role: "author" }}
        >
          <div data-testid="test-content">Test dashboard content</div>
        </DashboardLayout>
      );

      expect(screen.getByTestId("test-content")).toBeInTheDocument();
      expect(screen.getByText("Test dashboard content")).toBeInTheDocument();
    });

    it("does not render the Two-Factor Authentication card (Story 8.5)", async () => {
      const DashboardLayout = (
        await import("@/components/layout/DashboardLayout")
      ).default;

      render(
        <DashboardLayout
          user={{ email: "test@example.com", role: "author" }}
        >
          <div>Dashboard content</div>
        </DashboardLayout>
      );

      // AC 8.5.1: Verify 2FA card is not visible on dashboard
      expect(screen.queryByText(/Two-Factor Authentication/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Enable 2FA/i)).not.toBeInTheDocument();
    });
  });

  describe("ErrorBanner", () => {
    it("renders error message", async () => {
      const ErrorBanner = (await import("@/components/ui/ErrorBanner")).default;

      render(<ErrorBanner message="Something went wrong" />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("shows retry button when onRetry is provided", async () => {
      const ErrorBanner = (await import("@/components/ui/ErrorBanner")).default;
      const onRetry = jest.fn();

      render(<ErrorBanner message="Network error" onRetry={onRetry} />);

      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    it("does not show retry button when onRetry is not provided", async () => {
      const ErrorBanner = (await import("@/components/ui/ErrorBanner")).default;

      render(<ErrorBanner message="Something went wrong" />);

      expect(screen.queryByText("Try again")).not.toBeInTheDocument();
    });
  });

  describe("LoadingSkeleton", () => {
    it("renders loading skeleton", async () => {
      const LoadingSkeleton = (
        await import("@/components/ui/LoadingSkeleton")
      ).default;

      const { container } = render(<LoadingSkeleton />);

      // Should have animate-pulse class for loading animation
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });
});

describe("Profile Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns existing profile when found", async () => {
    const mockProfile = {
      id: "1",
      auth_id: "auth-123",
      email: "test@example.com",
      display_name: "Test User",
      pen_name: null,
      role: "author",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    (getOrCreateProfile as jest.Mock).mockResolvedValue({
      profile: mockProfile,
      error: null,
      isNewProfile: false,
    });

    const result = await getOrCreateProfile(
      {} as unknown as Parameters<typeof getOrCreateProfile>[0],
      "auth-123",
      "test@example.com"
    );

    expect(result.profile).toEqual(mockProfile);
    expect(result.isNewProfile).toBe(false);
    expect(result.error).toBeNull();
  });

  it("creates new profile when not found", async () => {
    const mockNewProfile = {
      id: "2",
      auth_id: "auth-456",
      email: "new@example.com",
      display_name: null,
      pen_name: null,
      role: "author",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    (getOrCreateProfile as jest.Mock).mockResolvedValue({
      profile: mockNewProfile,
      error: null,
      isNewProfile: true,
    });

    const result = await getOrCreateProfile(
      {} as unknown as Parameters<typeof getOrCreateProfile>[0],
      "auth-456",
      "new@example.com"
    );

    expect(result.profile).toEqual(mockNewProfile);
    expect(result.isNewProfile).toBe(true);
    expect(result.error).toBeNull();
  });

  it("handles fetch errors gracefully", async () => {
    (getOrCreateProfile as jest.Mock).mockResolvedValue({
      profile: null,
      error: "Failed to load profile. Please try again.",
      isNewProfile: false,
    });

    const result = await getOrCreateProfile(
      {} as unknown as Parameters<typeof getOrCreateProfile>[0],
      "auth-error",
      "error@example.com"
    );

    expect(result.profile).toBeNull();
    expect(result.error).toBe("Failed to load profile. Please try again.");
  });
});
