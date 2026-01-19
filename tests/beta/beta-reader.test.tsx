import { render, screen } from "@testing-library/react";
import BetaReaderClient from "@/app/beta/[token]/BetaReaderClient";

describe("BetaReaderClient", () => {
  const manuscript = {
    id: "manuscript-1",
    title: "Test Manuscript",
    content_text: "Hello world",
  };

  it("requires a display name before showing content when commenting is allowed", () => {
    render(
      <BetaReaderClient
        manuscript={manuscript}
        token="token-123"
        permissions="comment"
      />
    );

    expect(screen.getByText(/enter your display name/i)).toBeInTheDocument();
    expect(screen.queryByText("Hello world")).not.toBeInTheDocument();
  });

  it("shows content immediately for read-only access", () => {
    render(
      <BetaReaderClient
        manuscript={manuscript}
        token="token-123"
        permissions="read"
      />
    );

    expect(screen.getByText("Test Manuscript")).toBeInTheDocument();
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });
});
