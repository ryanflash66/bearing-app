/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ServiceGrid from "@/components/marketplace/ServiceGrid";
import { ServiceItem } from "@/lib/marketplace-data";

// Mock next/navigation for ServiceCard -> ServiceRequestModal
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn(),
  }),
}));

// Mock navigation module (used by ServiceCard for ISBN checkout)
jest.mock("@/lib/navigation", () => ({
  navigateTo: jest.fn(),
}));

// Mock ServiceRequestModal to avoid TiptapEditor and complex dependencies
jest.mock("@/components/marketplace/ServiceRequestModal", () => {
  return function MockServiceRequestModal({
    isOpen,
    onClose,
    serviceId,
    serviceTitle,
  }: {
    isOpen: boolean;
    onClose: () => void;
    serviceId: string;
    serviceTitle: string;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="service-request-modal" data-service-id={serviceId}>
        <span>Request {serviceTitle}</span>
        <button onClick={onClose}>Close Modal</button>
      </div>
    );
  };
});

describe("ServiceGrid", () => {
  const mockServices: ServiceItem[] = [
    {
      id: "service-1",
      title: "Service One",
      priceRange: "$100 - $200",
      description: "First service description",
      turnaroundTime: "5-7 days",
    },
    {
      id: "service-2",
      title: "Service Two",
      priceRange: "$200 - $300",
      description: "Second service description",
      turnaroundTime: "10-14 days",
    },
    {
      id: "service-3",
      title: "Service Three",
      priceRange: "$300 - $400",
      description: "Third service description",
      turnaroundTime: "3-5 days",
    },
  ];

  it("renders multiple service cards", () => {
    render(<ServiceGrid services={mockServices} />);
    
    expect(screen.getByText("Service One")).toBeInTheDocument();
    expect(screen.getByText("Service Two")).toBeInTheDocument();
    expect(screen.getByText("Service Three")).toBeInTheDocument();
  });

  it("renders grid with correct number of cards", () => {
    render(<ServiceGrid services={mockServices} />);
    
    const cards = screen.getAllByRole("button", { name: /request service/i });
    expect(cards).toHaveLength(3);
  });

  it("displays empty state when no services provided", () => {
    render(<ServiceGrid services={[]} />);
    
    expect(screen.getByText(/no services available/i)).toBeInTheDocument();
    expect(screen.getByText(/check back later for new offerings/i)).toBeInTheDocument();
  });

  it("displays empty state when services is null", () => {
    // @ts-expect-error Testing null handling
    render(<ServiceGrid services={null} />);
    
    expect(screen.getByText(/no services available/i)).toBeInTheDocument();
  });

  it("displays empty state when services is undefined", () => {
    // @ts-expect-error Testing undefined handling
    render(<ServiceGrid services={undefined} />);
    
    expect(screen.getByText(/no services available/i)).toBeInTheDocument();
  });

  it("applies grid layout classes", () => {
    const { container } = render(<ServiceGrid services={mockServices} />);
    
    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass("sm:grid-cols-2", "lg:grid-cols-3", "xl:grid-cols-4");
  });

  it("renders services in correct order", () => {
    render(<ServiceGrid services={mockServices} />);
    
    const titles = screen.getAllByRole("heading", { level: 3 });
    expect(titles[0]).toHaveTextContent("Service One");
    expect(titles[1]).toHaveTextContent("Service Two");
    expect(titles[2]).toHaveTextContent("Service Three");
  });

  it("renders empty state with icon", () => {
    const { container } = render(<ServiceGrid services={[]} />);
    
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("handles single service", () => {
    const singleService = [mockServices[0]];
    render(<ServiceGrid services={singleService} />);
    
    expect(screen.getByText("Service One")).toBeInTheDocument();
    expect(screen.queryByText("Service Two")).not.toBeInTheDocument();
  });
});
