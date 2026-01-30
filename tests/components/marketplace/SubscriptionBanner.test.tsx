/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SubscriptionBanner from "@/components/marketplace/SubscriptionBanner";

describe("SubscriptionBanner", () => {
  it("renders upgrade CTA for free tier users", () => {
    render(<SubscriptionBanner tier="free" />);

    // Should show upgrade messaging
    expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
    expect(screen.getByText("Unlock Premium Publishing Benefits")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Subscribe \/ Upgrade/i })).toBeInTheDocument();

    // Should show pro benefits
    expect(screen.getByText("Free ISBNs for all your books")).toBeInTheDocument();
    expect(screen.getByText("Priority cover design queue")).toBeInTheDocument();
    expect(screen.getByText("Dedicated Ops support")).toBeInTheDocument();
    expect(screen.getByText("10% discount on all services")).toBeInTheDocument();
  });

  it("renders pro status for pro tier users", () => {
    render(<SubscriptionBanner tier="pro" />);

    // Should show pro status acknowledgement
    expect(screen.getByText("Pro Member Access Active")).toBeInTheDocument();
    expect(screen.getByText("Enjoy priority support and exclusive benefits on all services.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage Subscription/i })).toBeInTheDocument();

    // Should NOT show upgrade messaging
    expect(screen.queryByText("Upgrade to Pro")).not.toBeInTheDocument();
  });

  it("renders enterprise status for enterprise tier users", () => {
    render(<SubscriptionBanner tier="enterprise" />);

    // Should show enterprise status
    expect(screen.getByText("Enterprise Member Access Active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage Subscription/i })).toBeInTheDocument();

    // Should NOT show upgrade messaging
    expect(screen.queryByText("Upgrade to Pro")).not.toBeInTheDocument();
  });

  it("links to subscription settings page", () => {
    render(<SubscriptionBanner tier="free" />);

    const upgradeLink = screen.getByRole("link", { name: /Subscribe \/ Upgrade/i });
    expect(upgradeLink).toHaveAttribute("href", "/dashboard/settings/subscription");
  });

  it("applies custom className", () => {
    const { container } = render(<SubscriptionBanner tier="free" className="custom-class" />);

    const banner = container.firstChild;
    expect(banner).toHaveClass("custom-class");
  });
});
