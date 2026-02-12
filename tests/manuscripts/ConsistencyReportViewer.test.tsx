import { render, screen, fireEvent } from "@testing-library/react";
import ConsistencyReportViewer from "@/components/manuscripts/ConsistencyReportViewer";
import { ConsistencyReport } from "@/lib/gemini";

// Mock report data
const mockReport: ConsistencyReport = {
  issues: Array.from({ length: 25 }, (_, i) => ({
    type: i % 2 === 0 ? "character" : "plot",
    severity: "medium",
    location: { quote: `Quote ${i}`, chapter: 1 },
    explanation: `Explanation ${i}`,
    suggestion: `Suggestion ${i}`,
  })),
  summary: "Test Summary",
};

describe("ConsistencyReportViewer", () => {
  it("renders summary and stats", () => {
    render(<ConsistencyReportViewer report={mockReport} onClose={() => {}} />);
    expect(screen.getByText("Test Summary")).toBeInTheDocument();
    expect(screen.getByText("Found 25 issues in your manuscript")).toBeInTheDocument();
  });

  it("paginates issues (shows only 20 initially)", () => {
    render(<ConsistencyReportViewer report={mockReport} onClose={() => {}} />);
    expect(screen.getByText('"Quote 0"')).toBeInTheDocument();
    expect(screen.getByText('"Quote 19"')).toBeInTheDocument();
    // Quote 20 should be on next page
    expect(screen.queryByText('"Quote 20"')).not.toBeInTheDocument();
  });

  it("navigates to next page", () => {
    render(<ConsistencyReportViewer report={mockReport} onClose={() => {}} />);
    const nextBtn = screen.getByText("Next");
    fireEvent.click(nextBtn);
    expect(screen.getByText('"Quote 20"')).toBeInTheDocument();
  });

  it("filters by type", () => {
    render(<ConsistencyReportViewer report={mockReport} onClose={() => {}} />);
    // Click 'Character' tab
    const charTab = screen.getByText(/Character \(\d+\)/);
    fireEvent.click(charTab);
    
    // Should show character issues (even indices)
    expect(screen.getByText('"Quote 0"')).toBeInTheDocument();
    // Should not show plot issues (odd indices)
    expect(screen.queryByText('"Quote 1"')).not.toBeInTheDocument();
  });

  it("calls onNavigate when Locate is clicked", () => {
    const handleNavigate = jest.fn();
    render(
      <ConsistencyReportViewer
        report={mockReport}
        onClose={() => {}}
        onNavigate={handleNavigate}
      />
    );
    // Find the first locate button (for Quote 0)
    const locateBtns = screen.getAllByText("Locate");
    fireEvent.click(locateBtns[0]);
    expect(handleNavigate).toHaveBeenCalledWith(mockReport.issues[0].location);
  });

  it("calls onExportPDF when export button is clicked", () => {
    const handleExport = jest.fn();
    render(
      <ConsistencyReportViewer
        report={mockReport}
        onClose={() => {}}
        onExportPDF={handleExport}
      />
    );
    const exportBtn = screen.getByText("Export PDF");
    fireEvent.click(exportBtn);
    expect(handleExport).toHaveBeenCalled();
  });
  it("filters by initial chapter if provided", () => {
    // Only Quote 0-1 matches Chapter 1 (mock data assumed to be all Chapter 1 for now? No, let's update mock if needed or assume)
    // The helper above creates all items with chapter: 1
    // Let's create a mixed report
    const mixedReport: ConsistencyReport = {
        issues: [
            { id: '1', type: 'plot', severity: 'high', location: { quote: 'Q1', chapter: 1 }, explanation: 'E1', suggestion: 'S1' },
            { id: '2', type: 'plot', severity: 'high', location: { quote: 'Q2', chapter: 2 }, explanation: 'E2', suggestion: 'S2' },
        ],
        summary: "Mixed Summary"
    };

    render(
        <ConsistencyReportViewer 
            report={mixedReport} 
            onClose={() => {}} 
            initialChapterFilter={1}
        />
    );

    // Should show Chapter 1 issue
    expect(screen.getByText('"Q1"')).toBeInTheDocument();
    // Should NOT show Chapter 2 issue
    expect(screen.queryByText('"Q2"')).not.toBeInTheDocument();
    
    // Should show chapter filter indicator
    expect(screen.getByText("Showing issues for Chapter 1")).toBeInTheDocument();
  });

  it("allows clearing chapter filter", () => {
    const mixedReport: ConsistencyReport = {
        issues: [
            { id: '1', type: 'plot', severity: 'high', location: { quote: 'Q1', chapter: 1 }, explanation: 'E1', suggestion: 'S1' },
            { id: '2', type: 'plot', severity: 'high', location: { quote: 'Q2', chapter: 2 }, explanation: 'E2', suggestion: 'S2' },
        ],
        summary: "Mixed Summary"
    };

    render(
        <ConsistencyReportViewer 
            report={mixedReport} 
            onClose={() => {}} 
            initialChapterFilter={1}
        />
    );

    expect(screen.queryByText('"Q2"')).not.toBeInTheDocument();

    const viewAllBtn = screen.getByText("View All Chapters");
    fireEvent.click(viewAllBtn);

    // Now showing Chapter 2 issue as well
    expect(screen.getByText('"Q2"')).toBeInTheDocument();
  });

  it("shows token usage summary when token counts are provided", () => {
    render(
      <ConsistencyReportViewer
        report={mockReport}
        tokensEstimated={1200}
        tokensActual={1500}
        model="gemini-2.0-flash"
        onClose={() => {}}
      />,
    );

    const summary = screen.getByTestId("token-usage-summary");
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent("Input:");
    expect(summary).toHaveTextContent("1,200");
    expect(summary).toHaveTextContent("Output:");
    expect(summary).toHaveTextContent("300");
    expect(summary).toHaveTextContent("Total:");
    expect(summary).toHaveTextContent("1,500");
    expect(summary).toHaveTextContent("gemini-2.0-flash");
  });

  it("hides token usage summary when total tokens are missing", () => {
    render(<ConsistencyReportViewer report={mockReport} onClose={() => {}} />);
    expect(screen.queryByTestId("token-usage-summary")).not.toBeInTheDocument();
  });
});
