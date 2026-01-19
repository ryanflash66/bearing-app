import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ServiceCard from "@/components/marketplace/ServiceCard";
import { ServiceItem } from "@/lib/marketplace-data";
import { navigateTo } from "@/lib/navigation";

const ASYNC_TIMEOUT = 2000;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock navigation module
jest.mock("@/lib/navigation", () => ({
  navigateTo: jest.fn(),
}));

const mockNavigateTo = navigateTo as jest.MockedFunction<typeof navigateTo>;

describe("ServiceCard", () => {
  const mockService: ServiceItem = {
    id: "test-service",
    title: "Test Service",
    priceRange: "$100 - $200",
    description: "This is a test service description",
    turnaroundTime: "5-7 days",
  };

  const mockISBNService: ServiceItem = {
    id: "isbn",
    title: "ISBN Registration",
    priceRange: "$125",
    description: "Official ISBN assignment for your book",
    turnaroundTime: "24-48 hours",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockNavigateTo.mockReset();
  });

  it("renders service information correctly", () => {
    render(<ServiceCard service={mockService} />);

    expect(screen.getByText("Test Service")).toBeInTheDocument();
    // Prices are intentionally hidden from the UI per Story 6.3 hotfix
    expect(screen.getByText("This is a test service description")).toBeInTheDocument();
    expect(screen.getByText("5-7 days")).toBeInTheDocument();
  });

  it("renders Request Service button for non-ISBN services", () => {
    render(<ServiceCard service={mockService} />);

    const button = screen.getByRole("button", { name: /request service/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("renders Buy ISBN button for ISBN service", () => {
    render(<ServiceCard service={mockISBNService} />);

    const button = screen.getByRole("button", { name: /buy isbn/i });
    expect(button).toBeInTheDocument();
    // Price removed from button text per Story 6.3 hotfix
    expect(button.textContent).toBe("Buy ISBN");
  });

  it("renders disabled Track Order button", () => {
    render(<ServiceCard service={mockService} />);

    const trackButton = screen.getByRole("button", { name: /track order feature coming soon/i });
    expect(trackButton).toBeInTheDocument();
    expect(trackButton).toBeDisabled();
    expect(trackButton).toHaveClass("cursor-not-allowed");
  });

  it("changes button state when requesting service", async () => {
    // Mock fetch to simulate API request with slight delay
    mockFetch.mockImplementation(() => 
      new Promise((resolve) => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, message: "Request submitted!" }),
        }), 100)
      )
    );
    const mockAlert = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<ServiceCard service={mockService} />);

    const button = screen.getByRole("button", { name: /request service/i });

    fireEvent.click(button);

    // Button should show "Processing..." and be disabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /processing/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();
    });

    // Button should return to normal state after request completes
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /request service/i })).toBeInTheDocument();
      },
      { timeout: ASYNC_TIMEOUT }
    );

    mockAlert.mockRestore();
  });

  it("prevents multiple simultaneous requests", async () => {
    // Mock fetch to simulate API request with delay
    mockFetch.mockImplementation(() => 
      new Promise((resolve) => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, message: "Request submitted!" }),
        }), 500)
      )
    );
    const mockAlert = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<ServiceCard service={mockService} />);

    const button = screen.getByRole("button", { name: /request service/i });

    // Click button multiple times rapidly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Button should be disabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();
    });

    mockAlert.mockRestore();
  });

  it("displays turnaround time with correct formatting", () => {
    render(<ServiceCard service={mockService} />);

    expect(screen.getByText(/turnaround:/i)).toBeInTheDocument();
    expect(screen.getByText("5-7 days")).toHaveClass("font-medium");
  });

  it("applies hover styles to card", () => {
    const { container } = render(<ServiceCard service={mockService} />);

    const card = container.querySelector(".rounded-xl");
    expect(card).toHaveClass("hover:border-blue-200", "hover:shadow-md");
  });

  // ISBN-specific tests
  describe("ISBN Purchase Flow", () => {
    it("calls checkout API when ISBN Buy button is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            url: "https://checkout.stripe.com/pay/cs_test",
            poolWarning: false,
          }),
      });

      render(<ServiceCard service={mockISBNService} />);

      const button = screen.getByRole("button", { name: /buy isbn/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/checkout/isbn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      });
    });

    it("shows pool warning modal when ISBN pool is empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            url: "https://checkout.stripe.com/pay/cs_test",
            poolWarning: true,
          }),
      });

      render(<ServiceCard service={mockISBNService} />);

      const button = screen.getByRole("button", { name: /buy isbn/i });
      fireEvent.click(button);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText(/ISBN Pool Notice/i)).toBeInTheDocument();
      });

      // Verify modal buttons are present
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue to payment/i })).toBeInTheDocument();
    });

    it("closes pool warning modal when Cancel is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            url: "https://checkout.stripe.com/pay/cs_test",
            poolWarning: true,
          }),
      });

      render(<ServiceCard service={mockISBNService} />);

      const button = screen.getByRole("button", { name: /buy isbn/i });
      fireEvent.click(button);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText(/ISBN Pool Notice/i)).toBeInTheDocument();
      });

      // Click Cancel
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByText(/ISBN Pool Notice/i)).not.toBeInTheDocument();
      });
    });

    it("navigates to Stripe checkout when Continue to Payment is clicked", async () => {
      const checkoutUrl = "https://checkout.stripe.com/pay/cs_test_continue";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            url: checkoutUrl,
            poolWarning: true,
          }),
      });

      render(<ServiceCard service={mockISBNService} />);

      const button = screen.getByRole("button", { name: /buy isbn/i });
      fireEvent.click(button);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText(/ISBN Pool Notice/i)).toBeInTheDocument();
      });

      // Verify navigateTo was NOT called yet (waiting for user confirmation)
      expect(mockNavigateTo).not.toHaveBeenCalled();

      // Click Continue to Payment
      const continueButton = screen.getByRole("button", { name: /continue to payment/i });
      fireEvent.click(continueButton);

      // Verify navigateTo was called with the checkout URL
      expect(mockNavigateTo).toHaveBeenCalledWith(checkoutUrl);
    });

    it("navigates directly to Stripe checkout when no pool warning", async () => {
      const checkoutUrl = "https://checkout.stripe.com/pay/cs_test_direct";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            url: checkoutUrl,
            poolWarning: false,
          }),
      });

      render(<ServiceCard service={mockISBNService} />);

      const button = screen.getByRole("button", { name: /buy isbn/i });
      fireEvent.click(button);

      // Verify navigateTo was called directly (no modal shown)
      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalledWith(checkoutUrl);
      });
    });

    it("displays error when checkout API fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Failed to create checkout session" }),
      });

      render(<ServiceCard service={mockISBNService} />);

      const button = screen.getByRole("button", { name: /buy isbn/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Failed to create checkout session/i)).toBeInTheDocument();
      });
    });

    it("makes API request for non-ISBN services", async () => {
      // Mock successful response
      const mockAlert = jest.spyOn(window, "alert").mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: "Request submitted successfully!" }),
      });

      render(<ServiceCard service={mockService} />);

      const button = screen.getByRole("button", { name: /request service/i });
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith("/api/services/request", expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }));
        },
        { timeout: ASYNC_TIMEOUT }
      );

      // Verify alert was called with success message
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Request submitted successfully!");
      });

      mockAlert.mockRestore();
    });
  });
});
