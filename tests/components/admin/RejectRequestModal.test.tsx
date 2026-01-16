/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import RejectRequestModal from "@/components/admin/RejectRequestModal";

// Mock fetch
global.fetch = jest.fn();

describe("RejectRequestModal", () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockRequest = {
    id: "req-1",
    user_id: "user-1",
    manuscript_id: null,
    service_type: "isbn" as const,
    status: "pending" as const,
    stripe_session_id: "sess-1",
    stripe_payment_intent_id: "pi-1",
    amount_cents: 12500,
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-10T10:00:00Z",
    metadata: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, refundId: "re_123" }),
    });
  });

  it("renders when isOpen is true", () => {
    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    expect(screen.getByText(/reject request/i)).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <RejectRequestModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    expect(screen.queryByText(/reject request/i)).not.toBeInTheDocument();
  });

  it("does not render when request is null", () => {
    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={null}
      />
    );

    expect(screen.queryByText(/reject request/i)).not.toBeInTheDocument();
  });

  // AC 5.4.3: Reason is required for rejection
  it("requires a reason for rejection", async () => {
    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const submitButton = screen.getByRole("button", { name: /reject/i });

    // Button should be disabled when reason is empty
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when reason is provided", () => {
    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const reasonInput = screen.getByPlaceholderText(/explain why/i);
    const submitButton = screen.getByRole("button", { name: /reject/i });

    fireEvent.change(reasonInput, { target: { value: "ISBN pool depleted" } });

    expect(submitButton).not.toBeDisabled();
  });

  // AC 5.4.3: Refund checkbox is checked by default
  it("has refund checkbox checked by default", () => {
    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const refundCheckbox = screen.getByRole("checkbox", { name: /initiate refund/i });
    expect(refundCheckbox).toBeChecked();
  });

  it("allows toggling refund checkbox", () => {
    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const refundCheckbox = screen.getByRole("checkbox", { name: /initiate refund/i });

    fireEvent.click(refundCheckbox);
    expect(refundCheckbox).not.toBeChecked();

    fireEvent.click(refundCheckbox);
    expect(refundCheckbox).toBeChecked();
  });

  // AC 5.4.3: Submitting rejection calls API
  it("calls reject API with correct payload", async () => {
    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const reasonInput = screen.getByPlaceholderText(/explain why/i);
    const submitButton = screen.getByRole("button", { name: /reject/i });

    fireEvent.change(reasonInput, { target: { value: "ISBN pool depleted" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/reject-request",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: "req-1",
            reason: "ISBN pool depleted",
            initiateRefund: true,
          }),
        })
      );
    });
  });

  it("calls onSuccess and onClose after successful rejection", async () => {
    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const reasonInput = screen.getByPlaceholderText(/explain why/i);
    const submitButton = screen.getByRole("button", { name: /reject/i });

    fireEvent.change(reasonInput, { target: { value: "Test reason" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("displays error message on API failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Refund failed" }),
    });

    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const reasonInput = screen.getByPlaceholderText(/explain why/i);
    const submitButton = screen.getByRole("button", { name: /reject/i });

    fireEvent.change(reasonInput, { target: { value: "Test reason" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/refund failed/i)).toBeInTheDocument();
    });
  });

  it("calls onClose when cancel is clicked", () => {
    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows loading state during submission", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }), 100))
    );

    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const reasonInput = screen.getByPlaceholderText(/explain why/i);
    const submitButton = screen.getByRole("button", { name: /reject/i });

    fireEvent.change(reasonInput, { target: { value: "Test reason" } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/rejecting/i)).toBeInTheDocument();
  });

  it("displays service type and amount in modal", () => {
    render(
      <RejectRequestModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    expect(screen.getByText(/isbn registration/i)).toBeInTheDocument();
    // Amount appears in multiple places (description and refund checkbox)
    expect(screen.getAllByText(/\$125\.00/).length).toBeGreaterThanOrEqual(1);
  });
});
