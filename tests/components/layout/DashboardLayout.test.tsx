import { render, screen, waitFor } from "@testing-library/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/components/notifications/NotificationBell", () => ({
  __esModule: true,
  default: () => <div data-testid="notification-bell" />,
}));

describe("DashboardLayout - Maintenance Banner", () => {
  const mockUser = {
    email: "test@example.com",
    displayName: "Test User",
    role: "user",
  };

  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
    (createClient as jest.Mock).mockReset();
  });

  it("displays maintenance banner when initialMaintenanceStatus is enabled", () => {
    render(
      <DashboardLayout
        user={mockUser}
        initialMaintenanceStatus={{
          enabled: true,
          message: "System maintenance in progress. Please check back later.",
        }}
      >
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Check that the maintenance banner is displayed
    expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    expect(
      screen.getByText("System maintenance in progress. Please check back later.")
    ).toBeInTheDocument();
  });

  it("displays correct maintenance message from initialMaintenanceStatus", () => {
    const customMessage = "We are upgrading our servers. Back online at 3 PM.";

    render(
      <DashboardLayout
        user={mockUser}
        initialMaintenanceStatus={{ enabled: true, message: customMessage }}
      >
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it("does not display maintenance banner when maintenance is disabled", () => {
    render(
      <DashboardLayout
        user={mockUser}
        initialMaintenanceStatus={{ enabled: false, message: "This should not appear" }}
      >
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Maintenance banner should not be present
    expect(screen.queryByText("System Maintenance")).not.toBeInTheDocument();
    expect(screen.queryByText("This should not appear")).not.toBeInTheDocument();
  });

  it("displays child content alongside maintenance banner", () => {
    render(
      <DashboardLayout
        user={mockUser}
        initialMaintenanceStatus={{ enabled: true, message: "Maintenance mode active" }}
      >
        <div>Dashboard Content</div>
      </DashboardLayout>
    );

    // Both maintenance banner and child content should be present
    expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });

  it("displays maintenance banner for non-admin users", () => {
    const regularUser = {
      email: "user@example.com",
      displayName: "Regular User",
      role: "user",
    };

    render(
      <DashboardLayout
        user={regularUser}
        initialMaintenanceStatus={{ enabled: true, message: "Scheduled maintenance" }}
      >
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Banner should be visible to regular users
    expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Scheduled maintenance")).toBeInTheDocument();
  });

  it("displays maintenance banner for admin users", () => {
    const adminUser = {
      email: "admin@example.com",
      displayName: "Admin User",
      role: "admin",
    };

    render(
      <DashboardLayout
        user={adminUser}
        initialMaintenanceStatus={{ enabled: true, message: "Admin maintenance test" }}
      >
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Banner should be visible to admins too
    expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Admin maintenance test")).toBeInTheDocument();
  });

  it("displays maintenance banner for super_admin users", () => {
    const superAdminUser = {
      email: "superadmin@example.com",
      displayName: "Super Admin",
      role: "super_admin",
    };

    render(
      <DashboardLayout
        user={superAdminUser}
        initialMaintenanceStatus={{ enabled: true, message: "Super admin maintenance test" }}
      >
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Banner should be visible to super admins too
    expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Super admin maintenance test")).toBeInTheDocument();
  });

  it("fetches maintenance status from Supabase when initialMaintenanceStatus is not provided", async () => {
    const mockSingle = jest.fn().mockResolvedValue({
      data: { value: { enabled: true, message: "Fetched maintenance" } },
    });
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSingle,
    };
    const mockSupabase = {
      from: jest.fn().mockReturnValue(mockQuery),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    });
    expect(screen.getByText("Fetched maintenance")).toBeInTheDocument();
  });
});
