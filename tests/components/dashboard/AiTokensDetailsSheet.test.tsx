import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiTokensDetailsSheet } from "@/components/dashboard/AiTokensDetailsSheet";
import type { FeatureBreakdown } from "@/lib/ai-usage";

describe("AiTokensDetailsSheet", () => {
  const mockBreakdown: FeatureBreakdown[] = [
    {
      feature: "consistency_check",
      label: "Consistency Checks",
      tokens: 5000,
      count: 10,
    },
    {
      feature: "suggestion",
      label: "AI Suggestions",
      tokens: 3000,
      count: 5,
    },
  ];

  it("shows trigger button and opens sheet on click", async () => {
    const user = userEvent.setup();
    const trigger = <button>View Details</button>;

    render(
      <AiTokensDetailsSheet
        breakdown={mockBreakdown}
        tokensUsed={8000}
        trigger={trigger}
      />
    );

    const triggerButton = screen.getByText("View Details");
    expect(triggerButton).toBeInTheDocument();

    await user.click(triggerButton);

    // Sheet should open and show title
    expect(screen.getByText("AI Token Usage Details")).toBeInTheDocument();
  });

  it("displays total tokens used with locale formatting", async () => {
    const user = userEvent.setup();
    const trigger = <button>View Details</button>;

    render(
      <AiTokensDetailsSheet
        breakdown={mockBreakdown}
        tokensUsed={8000}
        trigger={trigger}
      />
    );

    await user.click(screen.getByText("View Details"));

    expect(screen.getByText("8,000")).toBeInTheDocument();
  });

  it("displays monthly cap with locale formatting", async () => {
    const user = userEvent.setup();
    const trigger = <button>View Details</button>;

    render(
      <AiTokensDetailsSheet
        breakdown={mockBreakdown}
        tokensUsed={8000}
        trigger={trigger}
      />
    );

    await user.click(screen.getByText("View Details"));

    expect(screen.getByText("10,000,000")).toBeInTheDocument();
  });

  it("shows per-feature breakdown with labels", async () => {
    const user = userEvent.setup();
    const trigger = <button>View Details</button>;

    render(
      <AiTokensDetailsSheet
        breakdown={mockBreakdown}
        tokensUsed={8000}
        trigger={trigger}
      />
    );

    await user.click(screen.getByText("View Details"));

    // Check for feature labels
    expect(screen.getByText("Consistency Checks")).toBeInTheDocument();
    expect(screen.getByText("AI Suggestions")).toBeInTheDocument();

    // Check for action counts
    expect(screen.getByText("10 actions")).toBeInTheDocument();
    expect(screen.getByText("5 actions")).toBeInTheDocument();

    // Check for token counts with locale formatting
    expect(screen.getByText("5,000")).toBeInTheDocument();
    expect(screen.getByText("3,000")).toBeInTheDocument();
  });

  it("shows empty state when no usage events", async () => {
    const user = userEvent.setup();
    const trigger = <button>View Details</button>;

    render(
      <AiTokensDetailsSheet breakdown={[]} tokensUsed={0} trigger={trigger} />
    );

    await user.click(screen.getByText("View Details"));

    expect(screen.getByText("No AI usage yet this cycle.")).toBeInTheDocument();
  });

  it("includes upgrade CTA with link to settings", async () => {
    const user = userEvent.setup();
    const trigger = <button>View Details</button>;

    render(
      <AiTokensDetailsSheet
        breakdown={mockBreakdown}
        tokensUsed={8000}
        trigger={trigger}
      />
    );

    await user.click(screen.getByText("View Details"));

    expect(screen.getByText("Need more tokens?")).toBeInTheDocument();
    expect(screen.getByText(/additional tokens are available via plan upgrade/i)).toBeInTheDocument();

    const upgradeLink = screen.getByRole("link", { name: /view upgrade options/i });
    expect(upgradeLink).toHaveAttribute("href", "/dashboard/settings");
  });

  it("displays progress bar showing usage percentage", async () => {
    const user = userEvent.setup();
    const trigger = <button>View Details</button>;

    render(
      <AiTokensDetailsSheet
        breakdown={mockBreakdown}
        tokensUsed={8000}
        trigger={trigger}
      />
    );

    await user.click(screen.getByText("View Details"));

    // Check for percentage text (8000 / 10,000,000 = 0.08%)
    expect(screen.getByText(/0\.1% of monthly cap/i)).toBeInTheDocument();
  });
});
