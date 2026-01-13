import { render, screen } from "@testing-library/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePathname } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

describe("DashboardLayout - Maintenance Banner", () => {
  const mockUser = {
    email: "test@example.com",
    displayName: "Test User",
    role: "user",
  };

  const originalEnv = process.env;

  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("displays maintenance banner when NEXT_PUBLIC_MAINTENANCE_MODE is enabled", () => {
    // Set environment variable for maintenance mode
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = JSON.stringify({
      enabled: true,
      message: "System maintenance in progress. Please check back later.",
    });

    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Check that the maintenance banner is displayed
    expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    expect(
      screen.getByText("System maintenance in progress. Please check back later.")
    ).toBeInTheDocument();
  });

  it("displays correct maintenance message from environment variable", () => {
    const customMessage = "We are upgrading our servers. Back online at 3 PM.";
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = JSON.stringify({
      enabled: true,
      message: customMessage,
    });

    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it("does not display maintenance banner when maintenance is disabled", () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = JSON.stringify({
      enabled: false,
      message: "This should not appear",
    });

    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Maintenance banner should not be present
    expect(screen.queryByText("System Maintenance")).not.toBeInTheDocument();
    expect(screen.queryByText("This should not appear")).not.toBeInTheDocument();
  });

  it("does not display maintenance banner when environment variable is not set", () => {
    // Ensure NEXT_PUBLIC_MAINTENANCE_MODE is not set
    delete process.env.NEXT_PUBLIC_MAINTENANCE_MODE;

    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Maintenance banner should not be present
    expect(screen.queryByText("System Maintenance")).not.toBeInTheDocument();
  });

  it("does not display maintenance banner when environment variable is empty string", () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = "";

    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Maintenance banner should not be present
    expect(screen.queryByText("System Maintenance")).not.toBeInTheDocument();
  });

  it("handles malformed JSON in environment variable gracefully", () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = "invalid json";

    // Should not throw an error
    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Maintenance banner should not be present
    expect(screen.queryByText("System Maintenance")).not.toBeInTheDocument();
  });

  it("displays child content alongside maintenance banner", () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = JSON.stringify({
      enabled: true,
      message: "Maintenance mode active",
    });

    render(
      <DashboardLayout user={mockUser}>
        <div>Dashboard Content</div>
      </DashboardLayout>
    );

    // Both maintenance banner and child content should be present
    expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });

  it("displays maintenance banner for non-admin users", () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = JSON.stringify({
      enabled: true,
      message: "Scheduled maintenance",
    });

    const regularUser = {
      email: "user@example.com",
      displayName: "Regular User",
      role: "user",
    };

    render(
      <DashboardLayout user={regularUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Banner should be visible to regular users
    expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Scheduled maintenance")).toBeInTheDocument();
  });

  it("displays maintenance banner for admin users", () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = JSON.stringify({
      enabled: true,
      message: "Admin maintenance test",
    });

    const adminUser = {
      email: "admin@example.com",
      displayName: "Admin User",
      role: "admin",
    };

    render(
      <DashboardLayout user={adminUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Banner should be visible to admins too
    expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Admin maintenance test")).toBeInTheDocument();
  });

  it("displays maintenance banner for super_admin users", () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = JSON.stringify({
      enabled: true,
      message: "Super admin maintenance test",
    });

    const superAdminUser = {
      email: "superadmin@example.com",
      displayName: "Super Admin",
      role: "super_admin",
    };

    render(
      <DashboardLayout user={superAdminUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );

    // Banner should be visible to super admins too
    expect(screen.getByText("System Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Super admin maintenance test")).toBeInTheDocument();
  });
});
