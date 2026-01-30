/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrderDetail from "@/components/marketplace/OrderDetail";
import type { ServiceRequest } from "@/lib/marketplace-utils";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock timers for setTimeout
jest.useFakeTimers();

// Helper to create a full ServiceRequest object
function createMockOrder(overrides: Partial<ServiceRequest>): ServiceRequest {
  return {
    id: "order-1",
    user_id: "user-1",
    manuscript_id: null,
    service_type: "isbn",
    status: "pending",
    stripe_session_id: null,
    stripe_payment_intent_id: null,
    amount_cents: 12500,
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-10T10:00:00Z",
    metadata: {},
    ...overrides,
  };
}

describe("OrderDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // AC 5.3.2: Fulfilled ISBN request shows assigned ISBN with copy button
  describe("Completed ISBN order", () => {
    const completedIsbnOrder = createMockOrder({
      id: "order-1",
      service_type: "isbn",
      status: "completed",
      amount_cents: 12500,
      created_at: "2026-01-10T10:00:00Z",
      updated_at: "2026-01-11T15:00:00Z",
      metadata: { isbn: "978-1-234567-89-0" },
    });

    it("shows assigned ISBN number", () => {
      render(<OrderDetail order={completedIsbnOrder} />);

      expect(screen.getByText("978-1-234567-89-0")).toBeInTheDocument();
      expect(screen.getByText("Your ISBN")).toBeInTheDocument();
    });

    it("allows copying ISBN to clipboard", async () => {
      render(<OrderDetail order={completedIsbnOrder} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });

      await act(async () => {
        fireEvent.click(copyButton);
        // Wait for the async clipboard operation
        await Promise.resolve();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("978-1-234567-89-0");
    });

    it("shows completed status styling", () => {
      render(<OrderDetail order={completedIsbnOrder} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("Completed").closest("span")).toHaveClass("bg-green-100");
    });
  });

  // AC 5.3.3: Pending request shows processing indicator with estimated time
  describe("Pending order", () => {
    const pendingOrder = createMockOrder({
      id: "order-2",
      service_type: "cover_design",
      status: "pending",
      amount_cents: 29900,
      created_at: "2026-01-12T14:30:00Z",
      updated_at: "2026-01-12T14:30:00Z",
      metadata: {},
    });

    it("shows processing indicator", () => {
      render(<OrderDetail order={pendingOrder} />);

      expect(screen.getByText("Processing")).toBeInTheDocument();
    });

    it("shows estimated completion time", () => {
      render(<OrderDetail order={pendingOrder} />);

      expect(screen.getByText(/estimated/i)).toBeInTheDocument();
    });

    it("shows pending status styling", () => {
      render(<OrderDetail order={pendingOrder} />);

      const statusBadge = screen.getByText("Pending");
      expect(statusBadge.closest("span")).toHaveClass("bg-yellow-100");
    });
  });

  describe("In Progress order", () => {
    const inProgressOrder = createMockOrder({
      id: "order-3",
      service_type: "editing",
      status: "in_progress",
      amount_cents: 50000,
      created_at: "2026-01-13T09:15:00Z",
      updated_at: "2026-01-14T10:00:00Z",
      metadata: {},
    });

    it("shows in progress status badge", () => {
      render(<OrderDetail order={inProgressOrder} />);

      // Get the status badge specifically (not the info box heading)
      const statusBadge = screen.getByText("In Progress", { selector: "span" });
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass("bg-blue-100");
    });

    it("shows in progress info box", () => {
      render(<OrderDetail order={inProgressOrder} />);

      // Check for the info box content
      expect(screen.getByText(/our team is actively working/i)).toBeInTheDocument();
    });

    it("shows order details", () => {
      render(<OrderDetail order={inProgressOrder} />);

      // Service title appears in header
      expect(screen.getByRole("heading", { name: "Editing" })).toBeInTheDocument();
      expect(screen.getByText("$500.00")).toBeInTheDocument();
    });
  });

  describe("Common elements", () => {
    const order = createMockOrder({
      id: "order-1",
      service_type: "isbn",
      status: "completed",
      amount_cents: 12500,
      created_at: "2026-01-10T10:00:00Z",
      updated_at: "2026-01-11T15:00:00Z",
      metadata: {},
    });

    it("displays order date", () => {
      render(<OrderDetail order={order} />);

      expect(screen.getByText(/jan 10, 2026/i)).toBeInTheDocument();
    });

    it("displays order amount", () => {
      render(<OrderDetail order={order} />);

      expect(screen.getByText("$125.00")).toBeInTheDocument();
    });

    it("displays service type with readable name", () => {
      render(<OrderDetail order={order} />);

      // Service name appears in both header and details - use heading
      expect(screen.getByRole("heading", { name: "ISBN Registration" })).toBeInTheDocument();
    });
  });

  describe("Clipboard error handling", () => {
    const orderWithIsbn = createMockOrder({
      service_type: "isbn",
      status: "completed",
      metadata: { isbn: "978-1-234567-89-0" },
    });

    it("shows error state when clipboard fails", async () => {
      // Mock clipboard to fail
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error("Clipboard access denied"));

      render(<OrderDetail order={orderWithIsbn} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });

      await act(async () => {
        fireEvent.click(copyButton);
        await Promise.resolve();
      });

      expect(screen.getByText("Failed")).toBeInTheDocument();
      expect(screen.getByText(/could not copy to clipboard/i)).toBeInTheDocument();
    });
  });

  // Story 8.6: Publishing-help metadata display (AC 8.6.6)
  describe("Publishing Help order metadata display", () => {
    const publishingOrder = createMockOrder({
      id: "order-pub-1",
      service_type: "publishing_help",
      status: "pending",
      amount_cents: 0,
      created_at: "2026-01-15T12:00:00Z",
      updated_at: "2026-01-15T12:00:00Z",
      metadata: {
        isbn: "978-0-06-112008-4",
        bisac_codes: ["FIC009000", "FIC002000"],
        keywords: ["fantasy", "adventure", "epic"],
        education_level: "general",
        service_title: "Publishing Help",
      },
    });

    it("displays publishing request details section", () => {
      render(<OrderDetail order={publishingOrder} />);

      expect(screen.getByText("Publishing Request Details")).toBeInTheDocument();
    });

    it("displays ISBN when provided", () => {
      render(<OrderDetail order={publishingOrder} />);

      expect(screen.getByText("ISBN")).toBeInTheDocument();
      expect(screen.getByText("978-0-06-112008-4")).toBeInTheDocument();
    });

    it("displays BISAC categories as tags", () => {
      render(<OrderDetail order={publishingOrder} />);

      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("FIC009000")).toBeInTheDocument();
      expect(screen.getByText("FIC002000")).toBeInTheDocument();
    });

    it("displays keywords as tags", () => {
      render(<OrderDetail order={publishingOrder} />);

      expect(screen.getByText("Keywords")).toBeInTheDocument();
      expect(screen.getByText("fantasy")).toBeInTheDocument();
      expect(screen.getByText("adventure")).toBeInTheDocument();
      expect(screen.getByText("epic")).toBeInTheDocument();
    });

    it("displays education level formatted", () => {
      render(<OrderDetail order={publishingOrder} />);

      expect(screen.getByText("Education Level")).toBeInTheDocument();
      expect(screen.getByText("general")).toBeInTheDocument();
    });

    it("does not show ISBN section when ISBN not provided", () => {
      const orderWithoutIsbn = createMockOrder({
        service_type: "publishing_help",
        status: "pending",
        metadata: {
          bisac_codes: ["FIC000000"],
          keywords: ["fiction"],
        },
      });

      render(<OrderDetail order={orderWithoutIsbn} />);

      expect(screen.getByText("Publishing Request Details")).toBeInTheDocument();
      expect(screen.queryByText("ISBN")).not.toBeInTheDocument();
    });
  });
});
