import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiTokenHelp } from "@/components/dashboard/AiTokenHelp";

describe("AiTokenHelp", () => {
  it("renders info icon button", () => {
    render(<AiTokenHelp />);
    const button = screen.getByRole("button", { name: /what are ai tokens/i });
    expect(button).toBeInTheDocument();
  });

  it("is keyboard accessible", () => {
    render(<AiTokenHelp />);
    const button = screen.getByRole("button", { name: /what are ai tokens/i });
    expect(button).toHaveAttribute("aria-label", "What are AI tokens?");
  });

  it("shows popover content when triggered", async () => {
    const user = userEvent.setup();
    render(<AiTokenHelp />);

    const button = screen.getByRole("button", { name: /what are ai tokens/i });
    await user.click(button);

    // Check for key content in the popover
    expect(screen.getByText(/what are ai tokens\?/i)).toBeInTheDocument();
    expect(screen.getByText(/tokens are units of ai model usage/i)).toBeInTheDocument();
    expect(screen.getByText(/gemini consistency checks/i)).toBeInTheDocument();
    expect(screen.getByText(/llama ai suggestions/i)).toBeInTheDocument();
  });

  it("explains token reset and billing cycle", async () => {
    const user = userEvent.setup();
    render(<AiTokenHelp />);

    const button = screen.getByRole("button", { name: /what are ai tokens/i });
    await user.click(button);

    expect(screen.getByText(/tokens reset each billing cycle/i)).toBeInTheDocument();
    expect(screen.getByText(/tokens used \/ monthly cap/i)).toBeInTheDocument();
  });

  it("clarifies 'k' notation", async () => {
    const user = userEvent.setup();
    render(<AiTokenHelp />);

    const button = screen.getByRole("button", { name: /what are ai tokens/i });
    await user.click(button);

    // Text is split across elements: "Note: " + "<strong>k</strong>" + " means thousands of tokens."
    // Use a function matcher to find the parent element containing the full text
    const kNotation = screen.getByText((_content, element) => {
      return element?.tagName === "P" && /k\b.*means thousands of tokens/i.test(element.textContent || "");
    });
    expect(kNotation).toBeInTheDocument();
  });
});
