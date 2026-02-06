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
  usePathname: () => "/dashboard/orders",
}));

// Mock next/headers
jest.mock("next/headers", () => ({
  headers: jest.fn(() => ({
    get: jest.fn((key: string) => {
      if (key === "host") return "localhost:3000";
      if (key === "x-forwarded-proto") return "http";
      if (key === "cookie") return "session=test";
      return null;
    }),
  })),
}));

// Mock Supabase client
const mockGetUser = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({
  select: mockSelect,
}));

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    }),
  ),
}));

// Mock profile service
const mockGetOrCreateProfile = jest.fn();
jest.mock("@/lib/profile", () => ({
  getOrCreateProfile: mockGetOrCreateProfile,
}));

describe("MyOrdersPage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirect.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("redirects to login if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const MyOrdersPage = (await import("@/app/dashboard/orders/page")).default;
    await MyOrdersPage();

    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?returnUrl=%2Fdashboard%2Forders",
    );
  });

  it("renders order list for authenticated users", async () => {
    const mockUser = { id: "user-1", email: "author@example.com" };
    const mockProfile = {
      id: "profile-1",
      user_id: "user-1",
      display_name: "Author User",
      role: "author",
    };

    const mockOrders = [
      {
        id: "order-1",
        service_type: "isbn",
        status: "completed",
        amount_cents: 12500,
        created_at: "2026-01-10T10:00:00Z",
        metadata: { isbn: "978-1-234567-89-0" },
      },
      {
        id: "order-2",
        service_type: "cover_design",
        status: "pending",
        amount_cents: 29900,
        created_at: "2026-01-12T14:30:00Z",
        metadata: {},
      },
    ];

    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ profile: mockProfile });
    mockSelect.mockReturnValue({
      order: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
    });

    // Mock fetch for the orders API call
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockOrders }),
    }) as jest.Mock;

    const MyOrdersPage = (await import("@/app/dashboard/orders/page")).default;
    const result = await MyOrdersPage();

    render(result);

    // Find the page heading specifically (h2, level 2)
    expect(
      screen.getByRole("heading", { name: "My Orders", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/view your past service requests/i),
    ).toBeInTheDocument();
  });

  it("shows empty state when no orders exist", async () => {
    const mockUser = { id: "user-1", email: "author@example.com" };
    const mockProfile = {
      id: "profile-1",
      user_id: "user-1",
      display_name: "Author User",
      role: "author",
    };

    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockGetOrCreateProfile.mockResolvedValue({ profile: mockProfile });
    mockSelect.mockReturnValue({
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    // Mock fetch for the orders API call
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    }) as jest.Mock;

    const MyOrdersPage = (await import("@/app/dashboard/orders/page")).default;
    const result = await MyOrdersPage();

    render(result);

    expect(screen.getByText(/no service requests found/i)).toBeInTheDocument();
  });
});
