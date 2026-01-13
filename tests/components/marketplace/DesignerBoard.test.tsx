import { render, screen } from "@testing-library/react";
import DesignerBoard from "@/components/marketplace/DesignerBoard";

describe("DesignerBoard", () => {
  it("renders placeholder content", () => {
    render(<DesignerBoard />);
    
    expect(screen.getByText(/task board view/i)).toBeInTheDocument();
  });

  it("displays message for designers and support agents", () => {
    render(<DesignerBoard />);
    
    expect(screen.getByText(/this view is for designers and support agents/i)).toBeInTheDocument();
  });

  it("indicates future implementation", () => {
    render(<DesignerBoard />);
    
    expect(screen.getByText(/future implementation/i)).toBeInTheDocument();
  });

  it("renders icon element", () => {
    const { container } = render(<DesignerBoard />);
    
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("applies correct styling classes", () => {
    const { container } = render(<DesignerBoard />);
    
    const board = container.firstChild as HTMLElement;
    expect(board).toHaveClass("rounded-xl", "border-dashed", "bg-slate-50");
  });

  it("displays centered content", () => {
    const { container } = render(<DesignerBoard />);
    
    const board = container.firstChild as HTMLElement;
    expect(board).toHaveClass("text-center");
  });

  it("has proper icon container styling", () => {
    const { container } = render(<DesignerBoard />);
    
    const iconContainer = container.querySelector(".rounded-full");
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveClass("bg-slate-100");
  });
});
