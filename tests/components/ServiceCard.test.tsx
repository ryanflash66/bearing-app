import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ServiceCard from "@/components/marketplace/ServiceCard";
import { ServiceItem } from "@/lib/marketplace-data";
import { navigateTo } from "@/lib/navigation";

// Mock global fetch
global.fetch = jest.fn();

// Mock navigation module
jest.mock("@/lib/navigation", () => ({
  navigateTo: jest.fn(),
}));

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
    expect(screen.getByText("$125")).toBeInTheDocument();
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

  it("initiates Stripe checkout when Buy ISBN is clicked", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://stripe.com/checkout/session" }),
    });

    render(<ServiceCard service={mockIsbnService} />);
    
    const button = screen.getByRole("button", { name: /Buy ISBN/i });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Processing...");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/checkout/isbn", expect.objectContaining({
        method: "POST"
      }));
      // Check if navigateTo was called
      expect(navigateTo).toHaveBeenCalledWith("https://stripe.com/checkout/session");
    });
  });

  it("shows pool warning modal when API returns poolWarning: true", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://stripe.com/checkout/delayed", poolWarning: true }),
    });

    render(<ServiceCard service={mockIsbnService} />);
    
    const button = screen.getByRole("button", { name: /Buy ISBN/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("ISBN Pool Notice")).toBeInTheDocument();
      expect(navigateTo).not.toHaveBeenCalled(); // Should not navigate yet
    });

    // Test Confirm
    const confirmButton = screen.getByRole("button", { name: /Continue to Payment/i });
    fireEvent.click(confirmButton);
    
    expect(navigateTo).toHaveBeenCalledWith("https://stripe.com/checkout/delayed");
  });

  it("handles API errors gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Stripe error" }),
    });

    render(<ServiceCard service={mockIsbnService} />);
    
    const button = screen.getByRole("button", { name: /Buy ISBN/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Stripe error")).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });
  });
});
