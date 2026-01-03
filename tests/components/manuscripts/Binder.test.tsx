import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Binder from "@/components/manuscripts/Binder";
import { ConsistencyIssue } from "@/lib/gemini";

// Mocks
jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(),
}));

describe("Binder Component", () => {
  const mockContent = `
# Chapter One
This is the start.

## Scene 1
Some scene.

# Chapter Two
Next chapter.
  `;

  const mockIssues: ConsistencyIssue[] = [
    {
      id: "1",
      type: "plot",
      severity: "high",
      description: "Issue 1",
      location: { quote: "start" },
      suggestion: "Fix it",
    },
    {
      id: "2",
      type: "character",
      severity: "medium",
      description: "Issue 2",
      location: { quote: "Next chapter" },
      suggestion: "Fix it too",
    },
  ];

  it("renders chapter headings from content", () => {
    const { debug } = render(<Binder content={mockContent} />);
    debug();
    expect(screen.getByText("Chapter One")).toBeInTheDocument();
    expect(screen.getByText("Chapter Two")).toBeInTheDocument();
  });

  it("displays consistency badges with counts", () => {
    render(<Binder content={mockContent} issues={mockIssues} />);
    
    // Expect red badge for high severity associated with Chapter One
    // Note: Use a flexible query if exact structure isn't defined yet
    // But we want to ensure it's associated with the correct chapter
    
    // Chapter One should have 1 high issue (based on "start" quote matching first block)
    const chapterOne = screen.getByText("Chapter One").closest("li");
    // This assumes List Item structure
    
    // Just check for existence of badge for now
    expect(screen.getByLabelText("Critical Issues: 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Warnings: 1")).toBeInTheDocument();
  });

  it("navigates to chapter on click", () => {
    const handleChapterClick = jest.fn();
    render(<Binder content={mockContent} onChapterClick={handleChapterClick} />);
    
    fireEvent.click(screen.getByText("Chapter One"));
    expect(handleChapterClick).toHaveBeenCalledWith(expect.objectContaining({ title: "Chapter One" }));
  });

  it("handles badge click separately", () => {
    const handleBadgeClick = jest.fn();
    const handleChapterClick = jest.fn();
    render(
      <Binder 
        content={mockContent} 
        issues={mockIssues} 
        onBadgeClick={handleBadgeClick} 
        onChapterClick={handleChapterClick}
      />
    );
    
    // Find the red badge and click it
    // The badge is inside a div with onClick handler that stops propagation
    // We can target via aria-label
    const badge = screen.getByLabelText("Critical Issues: 1");
    // Click the parent div (which has the handler)
    // Closest div might be the badge container itself if the span doesn't block clicks (it shouldn't)
    // Actually the click handler is on the DIV wrapping the spans.
    fireEvent.click(badge); // Clicking the span bubbles to the div
    
    expect(handleBadgeClick).toHaveBeenCalledWith(1); // Chapter 1 (1-based index)
    expect(handleChapterClick).not.toHaveBeenCalled();
  });
});
