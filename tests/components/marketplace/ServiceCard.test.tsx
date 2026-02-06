/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ServiceCard from "@/components/marketplace/ServiceCard";
import { ServiceItem } from "@/lib/marketplace-data";
// Mock navigation module
jest.mock("@/lib/navigation", () => ({
  navigateTo: jest.fn(),
}));

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

// Mock IsbnRegistrationModal
jest.mock("@/components/marketplace/IsbnRegistrationModal", () => {
  return function MockIsbnRegistrationModal({
    isOpen,
    onClose,
    manuscriptId,
    userDisplayName,
  }: {
    isOpen: boolean;
    onClose: () => void;
    manuscriptId?: string;
    userDisplayName?: string;
  }) {
    if (!isOpen) return null;
    return (
      <div
        data-testid="isbn-registration-modal"
        data-manuscript-id={manuscriptId || ""}
        data-user-display-name={userDisplayName || ""}
      >
        <span>ISBN Registration</span>
        <button onClick={onClose}>Close ISBN Modal</button>
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
    it("opens ISBN modal when Buy ISBN is clicked", async () => {
      render(<ServiceCard service={mockISBNService} />);

      const button = screen.getByRole("button", { name: /buy isbn/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId("isbn-registration-modal")).toBeInTheDocument();
      });
    });

    it("passes manuscriptId and userDisplayName to ISBN modal when provided", async () => {
      render(
        <ServiceCard
          service={mockISBNService}
          manuscriptId="manuscript-123"
          userDisplayName="Jane Author"
        />
      );

      const button = screen.getByRole("button", { name: /buy isbn/i });
      fireEvent.click(button);

      await waitFor(() => {
        const modal = screen.getByTestId("isbn-registration-modal");
        expect(modal).toHaveAttribute("data-manuscript-id", "manuscript-123");
        expect(modal).toHaveAttribute("data-user-display-name", "Jane Author");
      });
    });

    it("does not open ServiceRequestModal for ISBN service", async () => {
      render(<ServiceCard service={mockISBNService} />);

      const button = screen.getByRole("button", { name: /buy isbn/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.queryByTestId("service-request-modal")).not.toBeInTheDocument();
      });
    });
  });
});
