/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrderList from "@/components/marketplace/OrderList";

// Mock Next.js Link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock next/navigation for useRouter
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

import type { ServiceRequest } from "@/lib/marketplace-utils";

const mockOrders: ServiceRequest[] = [
  {
    id: "order-1",
    user_id: "user-1",
    manuscript_id: null,
    service_type: "isbn",
    status: "completed",
    stripe_session_id: null,
    stripe_payment_intent_id: null,
    amount_cents: 12500,
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-10T10:00:00Z",
    metadata: { isbn: "978-1-234567-89-0" },
  },
  {
    id: "order-2",
    user_id: "user-1",
    manuscript_id: null,
    service_type: "cover_design",
    status: "pending",
    stripe_session_id: null,
    stripe_payment_intent_id: null,
    amount_cents: 29900,
    created_at: "2026-01-12T14:30:00Z",
    updated_at: "2026-01-12T14:30:00Z",
    metadata: {},
  },
  {
    id: "order-3",
    user_id: "user-1",
    manuscript_id: null,
    service_type: "editing",
    status: "in_progress",
    stripe_session_id: null,
    stripe_payment_intent_id: null,
    amount_cents: 50000,
    created_at: "2026-01-13T09:15:00Z",
    updated_at: "2026-01-13T09:15:00Z",
    metadata: {},
  },
];

describe("OrderList", () => {
  it("renders all orders with correct information", () => {
    render(<OrderList orders={mockOrders} />);

    // AC 5.3.1: Each item shows date, service type, amount, and current status
    expect(screen.getByText("ISBN Registration")).toBeInTheDocument();
    expect(screen.getByText("$125.00")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();

    expect(screen.getByText("Cover Design")).toBeInTheDocument();
    expect(screen.getByText("$299.00")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();

    expect(screen.getByText("Editing")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders dates in readable format", () => {
    render(<OrderList orders={mockOrders} />);

    // Should display dates (format may vary)
    expect(screen.getByText(/Jan 10, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 12, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 13, 2026/)).toBeInTheDocument();
  });

  it("links each order to its detail page", () => {
    render(<OrderList orders={mockOrders} />);

    // OrderItem uses role="link" with onClick for row navigation
    const linkRows = screen.getAllByRole("link");
    // The first 3 are the order rows (navigation via router.push)
    // Filter by aria-label which contains "View order"
    const orderLinks = linkRows.filter((link) =>
      link.getAttribute("aria-label")?.includes("View order"),
    );
    expect(orderLinks).toHaveLength(3);
  });

  it("renders empty state when no orders", () => {
    render(<OrderList orders={[]} />);

    expect(screen.getByText(/no service requests found/i)).toBeInTheDocument();
    expect(screen.getByText(/browse the marketplace/i)).toBeInTheDocument();
  });

  it("applies correct status styling", () => {
    render(<OrderList orders={mockOrders} />);

    const completedBadge = screen.getByText("Completed");
    const pendingBadge = screen.getByText("Pending");
    const inProgressBadge = screen.getByText("In Progress");

    // Check status badges exist with appropriate styling classes
    expect(completedBadge.closest("span")).toHaveClass("bg-green-100");
    expect(pendingBadge.closest("span")).toHaveClass("bg-yellow-100");
    expect(inProgressBadge.closest("span")).toHaveClass("bg-blue-100");
  });
});
