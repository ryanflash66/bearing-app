/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ServiceCard from "@/components/marketplace/ServiceCard";
import { ServiceItem } from "@/lib/marketplace-data";
import { navigateTo } from "@/lib/navigation";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock navigation module
jest.mock("@/lib/navigation", () => ({
  navigateTo: jest.fn(),
}));

const mockNavigateTo = navigateTo as jest.MockedFunction<typeof navigateTo>;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn(),
  }),
}));

// Mock ServiceRequestModal
jest.mock("@/components/marketplace/ServiceRequestModal", () => {
  return function MockServiceRequestModal({
    isOpen,
    onClose,
    serviceId,
    serviceTitle,
    onSuccess,
  }: {
    isOpen: boolean;
    onClose: () => void;
    serviceId: string;
    serviceTitle: string;
    onSuccess?: () => void;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="service-request-modal" data-service-id={serviceId}>
        <span>Request {serviceTitle}</span>
        <button onClick={onClose}>Close Modal</button>
        <button
          onClick={() => {
            if (onSuccess) onSuccess();
            onClose();
          }}
        >
          Submit Request
        </button>
      </div>
    );
  };
});

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

  const mockWebsiteService: ServiceItem = {
    id: "author-website",
    title: "Author Website",
    priceRange: "$500 - $1,500",
    description: "A professional website to showcase your books",
    turnaroundTime: "2-3 weeks",
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

  // Modal behavior tests for non-ISBN services
  describe("Service Request Modal Flow", () => {
    it("opens ServiceRequestModal when clicking Request Service", async () => {
      render(<ServiceCard service={mockWebsiteService} />);

      const requestButton = screen.getByRole("button", { name: /Request Service/i });
      fireEvent.click(requestButton);

      await waitFor(() => {
        expect(screen.getByTestId("service-request-modal")).toBeInTheDocument();
        expect(screen.getByTestId("service-request-modal")).toHaveAttribute(
          "data-service-id",
          "author-website"
        );
      });
    });

    it("closes modal when clicking close button", async () => {
      render(<ServiceCard service={mockWebsiteService} />);

      // Open modal
      const requestButton = screen.getByRole("button", { name: /Request Service/i });
      fireEvent.click(requestButton);

      await waitFor(() => {
        expect(screen.getByTestId("service-request-modal")).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByRole("button", { name: /Close Modal/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("service-request-modal")).not.toBeInTheDocument();
      });
    });

    it("passes correct service info to modal", async () => {
      render(<ServiceCard service={mockWebsiteService} />);

      const requestButton = screen.getByRole("button", { name: /Request Service/i });
      fireEvent.click(requestButton);

      await waitFor(() => {
        expect(screen.getByText("Request Author Website")).toBeInTheDocument();
      });
    });

    it("shows a success toast after request submission", async () => {
      render(<ServiceCard service={mockWebsiteService} />);

      const requestButton = screen.getByRole("button", { name: /Request Service/i });
      fireEvent.click(requestButton);

      await waitFor(() => {
        expect(screen.getByTestId("service-request-modal")).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", { name: /Submit Request/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Author Website request submitted successfully.")
        ).toBeInTheDocument();
      });
    });
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

    it("does not open modal for ISBN service (uses direct checkout)", async () => {
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

      // The service request modal should NOT be shown for ISBN
      await waitFor(() => {
        expect(screen.queryByTestId("service-request-modal")).not.toBeInTheDocument();
      });
    });
  });
});
