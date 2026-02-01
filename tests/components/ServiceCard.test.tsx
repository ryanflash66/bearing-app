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
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="isbn-registration-modal">
        <span>ISBN Registration</span>
        <button onClick={onClose}>Close ISBN Modal</button>
      </div>
    );
  };
});

const mockIsbnService: ServiceItem = {
  id: "isbn",
  title: "ISBN Assignment",
  description: "Get a valid ISBN.",
  priceRange: "$125",
  turnaroundTime: "Instant"
};

const mockOtherService: ServiceItem = {
  id: "cover-design",
  title: "Cover Design",
  description: "Professional cover.",
  priceRange: "$500",
  turnaroundTime: "5 days"
};

describe("ServiceCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders service details correctly", () => {
    render(<ServiceCard service={mockIsbnService} />);
    expect(screen.getByText("ISBN Assignment")).toBeInTheDocument();
    // Prices are intentionally hidden from the UI per Story 6.3 hotfix
    expect(screen.getByText("Instant")).toBeInTheDocument();
  });

  it("renders 'Buy ISBN' button for ISBN service", () => {
    render(<ServiceCard service={mockIsbnService} />);
    const button = screen.getByRole("button", { name: /Buy ISBN/i });
    expect(button).toBeInTheDocument();
  });

  it("renders 'Request Service' button for non-ISBN service", () => {
    render(<ServiceCard service={mockOtherService} />);
    const button = screen.getByRole("button", { name: /Request Service/i });
    expect(button).toBeInTheDocument();
  });

  it("opens ISBN modal when Buy ISBN is clicked", async () => {
    render(<ServiceCard service={mockIsbnService} />);

    const button = screen.getByRole("button", { name: /Buy ISBN/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("isbn-registration-modal")).toBeInTheDocument();
    });
  });

  it("shows a success toast after service request submission", async () => {
    render(<ServiceCard service={mockOtherService} />);

    const button = screen.getByRole("button", { name: /Request Service/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("service-request-modal")).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", { name: /Submit Request/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Cover Design request submitted successfully.")
      ).toBeInTheDocument();
    });
  });
});
