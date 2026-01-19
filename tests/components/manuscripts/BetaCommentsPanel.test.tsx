import { render, screen, fireEvent } from "@testing-library/react";
import BetaCommentsPanel from "@/components/manuscripts/BetaCommentsPanel";

const mockComments = [
  {
    id: "comment-1",
    author_name: "Reader One",
    comment_text: "Great opening line.",
    selected_text: "Once upon a time",
    type: "General Feedback",
    status: "open",
  },
  {
    id: "comment-2",
    author_name: "Reader Two",
    comment_text: "Typo on this word.",
    selected_text: "teh",
    type: "Typo/Grammar",
    status: "resolved",
  },
];

describe("BetaCommentsPanel", () => {
  it("renders beta comments with labels", () => {
    render(<BetaCommentsPanel comments={mockComments} onResolve={jest.fn()} />);

    expect(screen.getByText("Reader One")).toBeInTheDocument();
    expect(screen.getByText("Reader Two")).toBeInTheDocument();
    expect(screen.getByText(/General Feedback/i)).toBeInTheDocument();
    expect(screen.getByText(/Typo\/Grammar/i)).toBeInTheDocument();
  });

  it("calls onResolve for unresolved comments", () => {
    const onResolve = jest.fn();
    render(<BetaCommentsPanel comments={mockComments} onResolve={onResolve} />);

    const resolveButton = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(resolveButton);

    expect(onResolve).toHaveBeenCalledWith("comment-1");
  });
});
