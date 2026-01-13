import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ServiceCard from "@/components/marketplace/ServiceCard";
import { ServiceItem } from "@/lib/marketplace-data";

describe("ServiceCard", () => {
  const mockService: ServiceItem = {
    id: "test-service",
    title: "Test Service",
    priceRange: "$100 - $200",
    description: "This is a test service description",
    turnaroundTime: "5-7 days",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders service information correctly", () => {
    render(<ServiceCard service={mockService} />);
    
    expect(screen.getByText("Test Service")).toBeInTheDocument();
    expect(screen.getByText("$100 - $200")).toBeInTheDocument();
    expect(screen.getByText("This is a test service description")).toBeInTheDocument();
    expect(screen.getByText("5-7 days")).toBeInTheDocument();
  });

  it("renders Request Service button", () => {
    render(<ServiceCard service={mockService} />);
    
    const button = screen.getByRole("button", { name: /request service/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("renders disabled Track Order button", () => {
    render(<ServiceCard service={mockService} />);
    
    const trackButton = screen.getByRole("button", { name: /track order feature coming soon/i });
    expect(trackButton).toBeInTheDocument();
    expect(trackButton).toBeDisabled();
    expect(trackButton).toHaveClass("cursor-not-allowed");
  });

  it("changes button state when requesting service", async () => {
    render(<ServiceCard service={mockService} />);
    
    const button = screen.getByRole("button", { name: /request service/i });
    
    fireEvent.click(button);
    
    // Button should show "Processing..." and be disabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /processing/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();
    });
    
    // Button should return to normal state after request completes
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /request service/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /request service/i })).not.toBeDisabled();
    }, { timeout: 2000 });
  });

  it("prevents multiple simultaneous requests", async () => {
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
  });

  it("displays turnaround time with correct formatting", () => {
    render(<ServiceCard service={mockService} />);
    
    expect(screen.getByText(/turnaround:/i)).toBeInTheDocument();
    expect(screen.getByText("5-7 days")).toHaveClass("font-medium");
  });

  it("applies hover styles to card", () => {
    const { container } = render(<ServiceCard service={mockService} />);
    
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("hover:border-blue-200", "hover:shadow-md");
  });
});
