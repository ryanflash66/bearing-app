/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ISBNAssignmentModal from "@/components/admin/ISBNAssignmentModal";

// Mock fetch
global.fetch = jest.fn();

describe("ISBNAssignmentModal", () => {
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
      json: () => Promise.resolve({ success: true }),
    });
  });

  it("renders when open is true", () => {
    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    expect(screen.getByText(/assign isbn/i)).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <ISBNAssignmentModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    expect(screen.queryByText(/assign isbn/i)).not.toBeInTheDocument();
  });

  // AC 5.4.2: Prompted to enter/assign an ISBN
  it("provides input field for manual ISBN entry", () => {
    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const input = screen.getByPlaceholderText(/978-/i);
    expect(input).toBeInTheDocument();
  });

  it("validates ISBN format (13 digits)", async () => {
    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const input = screen.getByPlaceholderText(/978-/i);
    // Get the submit button (type="submit") not the auto-assign button
    const submitButton = screen.getByRole("button", { name: /^assign$/i });

    // Enter invalid ISBN
    fireEvent.change(input, { target: { value: "123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid isbn/i)).toBeInTheDocument();
    });
  });

  it("submits valid ISBN and calls onSuccess", async () => {
    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const input = screen.getByPlaceholderText(/978-/i);
    const submitButton = screen.getByRole("button", { name: /^assign$/i });

    fireEvent.change(input, { target: { value: "9781234567890" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/fulfill-request",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("9781234567890"),
        })
      );
    });
  });

  it("shows auto-assign option when pool is available", () => {
    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
        availableIsbnCount={5}
      />
    );

    expect(screen.getByText(/auto-assign from pool/i)).toBeInTheDocument();
    expect(screen.getByText(/5 available/i)).toBeInTheDocument();
  });

  it("disables auto-assign when pool is empty", () => {
    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
        availableIsbnCount={0}
      />
    );

    const autoAssignButton = screen.getByRole("button", { name: /auto-assign/i });
    expect(autoAssignButton).toBeDisabled();
  });

  it("calls onClose when cancel is clicked", () => {
    render(
      <ISBNAssignmentModal
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
    // Delay the fetch response
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }), 100))
    );

    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
      />
    );

    const input = screen.getByPlaceholderText(/978-/i);
    const submitButton = screen.getByRole("button", { name: /^assign$/i });

    fireEvent.change(input, { target: { value: "9781234567890" } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/assigning/i)).toBeInTheDocument();
  });

  // AC 5.4.2: Auto-assign from pool tests
  it("calls API with autoAssign=true when auto-assign button is clicked", async () => {
    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
        availableIsbnCount={5}
      />
    );

    const autoAssignButton = screen.getByRole("button", { name: /auto-assign/i });
    fireEvent.click(autoAssignButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/fulfill-request",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            requestId: "req-1",
            autoAssign: true,
          }),
        })
      );
    });
  });

  it("calls onSuccess after successful auto-assign", async () => {
    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
        availableIsbnCount={5}
      />
    );

    const autoAssignButton = screen.getByRole("button", { name: /auto-assign/i });
    fireEvent.click(autoAssignButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("displays error when auto-assign fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "No ISBNs available in pool" }),
    });

    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
        availableIsbnCount={5}
      />
    );

    const autoAssignButton = screen.getByRole("button", { name: /auto-assign/i });
    fireEvent.click(autoAssignButton);

    await waitFor(() => {
      expect(screen.getByText(/no isbns available/i)).toBeInTheDocument();
    });
  });

  it("shows loading state during auto-assign", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }), 100))
    );

    render(
      <ISBNAssignmentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        request={mockRequest}
        availableIsbnCount={5}
      />
    );

    const autoAssignButton = screen.getByRole("button", { name: /auto-assign/i });
    fireEvent.click(autoAssignButton);

    await waitFor(() => {
      expect(screen.getByText(/assigning\.\.\./i)).toBeInTheDocument();
    });
  });
});
