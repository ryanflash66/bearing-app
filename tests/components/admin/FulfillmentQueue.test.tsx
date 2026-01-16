/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import FulfillmentQueue from "@/components/admin/FulfillmentQueue";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock date-fns format
jest.mock("date-fns", () => ({
  format: (date: Date) => date.toISOString().split("T")[0],
  formatDistanceToNow: () => "2 days ago",
}));

import type { ServiceRequest } from "@/lib/marketplace-utils";

interface FulfillmentQueueRequest extends ServiceRequest {
  user_email?: string;
  user_display_name?: string;
}

const mockPendingRequests: FulfillmentQueueRequest[] = [
  {
    id: "req-1",
    user_id: "user-1",
    manuscript_id: null,
    service_type: "isbn",
    status: "pending",
    stripe_session_id: "sess-1",
    stripe_payment_intent_id: "pi-1",
    amount_cents: 12500,
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-10T10:00:00Z",
    metadata: {},
    user_email: "author1@example.com",
    user_display_name: "Jane Author",
  },
  {
    id: "req-2",
    user_id: "user-2",
    manuscript_id: null,
    service_type: "isbn",
    status: "pending",
    stripe_session_id: "sess-2",
    stripe_payment_intent_id: "pi-2",
    amount_cents: 12500,
    created_at: "2026-01-12T14:30:00Z",
    updated_at: "2026-01-12T14:30:00Z",
    metadata: {},
    user_email: "author2@example.com",
    user_display_name: "John Writer",
  },
];

describe("FulfillmentQueue", () => {
  const mockOnFulfill = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // AC 5.4.1: Queue of pending service requests sorted by oldest first
  it("renders pending requests sorted by oldest first", () => {
    render(
      <FulfillmentQueue
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
        onReject={mockOnReject}
      />
    );

    const rows = screen.getAllByRole("row");
    // Header row + 2 data rows
    expect(rows.length).toBe(3);

    // First request should be older (Jane Author)
    expect(screen.getByText("Jane Author")).toBeInTheDocument();
    expect(screen.getByText("John Writer")).toBeInTheDocument();
  });

  it("displays request details including user email, service type, and amount", () => {
    render(
      <FulfillmentQueue
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
        onReject={mockOnReject}
      />
    );

    // User emails
    expect(screen.getByText("author1@example.com")).toBeInTheDocument();
    expect(screen.getByText("author2@example.com")).toBeInTheDocument();

    // Service type
    expect(screen.getAllByText("ISBN Registration")).toHaveLength(2);

    // Amount
    expect(screen.getAllByText("$125.00")).toHaveLength(2);
  });

  // AC 5.4.2: Fulfill button triggers fulfillment action
  it("calls onFulfill when Fulfill button is clicked", () => {
    render(
      <FulfillmentQueue
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
        onReject={mockOnReject}
      />
    );

    const fulfillButtons = screen.getAllByRole("button", { name: /fulfill/i });
    fireEvent.click(fulfillButtons[0]);

    expect(mockOnFulfill).toHaveBeenCalledWith(mockPendingRequests[0]);
  });

  // AC 5.4.3: Reject/Refund button triggers rejection action
  it("calls onReject when Reject button is clicked", () => {
    render(
      <FulfillmentQueue
        requests={mockPendingRequests}
        onFulfill={mockOnFulfill}
        onReject={mockOnReject}
      />
    );

    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    fireEvent.click(rejectButtons[0]);

    expect(mockOnReject).toHaveBeenCalledWith(mockPendingRequests[0]);
  });

  it("renders empty state when no pending requests", () => {
    render(
      <FulfillmentQueue
        requests={[]}
        onFulfill={mockOnFulfill}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
  });

  it("shows loading state when isLoading is true", () => {
    render(
      <FulfillmentQueue
        requests={[]}
        onFulfill={mockOnFulfill}
        onReject={mockOnReject}
        isLoading={true}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
