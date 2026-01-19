
import { generatePDF } from "../../src/lib/export";
import { defaultExportSettings } from "../../src/lib/export-types";
import puppeteer from "puppeteer";

// Mock Puppeteer
jest.mock("puppeteer", () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setJavaScriptEnabled: jest.fn().mockResolvedValue(undefined),
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from("PDF_BUFFER")),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe("generatePDF", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate PDF with default settings using Puppeteer", async () => {
    const title = "Test Title";
    const content = "<p>Test Content</p>";
    
    const buffer = await generatePDF(title, content);
    
    expect(buffer).toBeDefined();
    expect(puppeteer.launch).toHaveBeenCalled();
    
    const mockLaunch = puppeteer.launch as jest.Mock;
    const browser = await mockLaunch.mock.results[0].value;
    const page = await browser.newPage.mock.results[0].value;
    
    // Check if setContent was called with the HTML including our content
    expect(page.setContent).toHaveBeenCalledWith(
      expect.stringContaining("Test Content"),
      expect.objectContaining({ waitUntil: "domcontentloaded" })
    );
    // Ensure HTML markup is preserved (not escaped as text)
    expect(page.setContent).toHaveBeenCalledWith(
      expect.not.stringContaining("&lt;p&gt;"),
      expect.anything()
    );
    expect(page.setContent).toHaveBeenCalledWith(
      expect.stringContaining("<p>Test Content</p>"),
      expect.anything()
    );
    
    // Check if pdf() was called with default 6x9 dimensions
    expect(page.pdf).toHaveBeenCalledWith(
      expect.objectContaining({
        width: "6in",
        height: "9in",
      })
    );
  });

  it("should respect custom page sizes (A4)", async () => {
    const title = "Test Title";
    const content = "Test Content";
    const settings = {
        ...defaultExportSettings,
        pageSize: "a4" as const
    };

    await generatePDF(title, content, undefined, settings);

    const mockLaunch = puppeteer.launch as jest.Mock;
    const browser = await mockLaunch.mock.results[0].value;
    const page = await browser.newPage.mock.results[0].value;

    expect(page.pdf).toHaveBeenCalledWith(
      expect.objectContaining({
        width: "210mm",
        height: "297mm",
      })
    );
  });

  it("should include frontmatter if metadata is provided", async () => {
    const title = "Test Title";
    const content = "Test Content";
    const metadata = {
        publisher_name: "Test Publisher",
        copyright_year: 2026,
        copyright_holder: "Author Name"
    };

    await generatePDF(title, content, undefined, defaultExportSettings, metadata);

    const mockLaunch = puppeteer.launch as jest.Mock;
    const browser = await mockLaunch.mock.results[0].value;
    const page = await browser.newPage.mock.results[0].value;

    expect(page.setContent).toHaveBeenCalledWith(
      expect.stringContaining("Test Publisher"),
      expect.anything()
    );
    expect(page.setContent).toHaveBeenCalledWith(
      expect.stringContaining("2026"),
      expect.anything()
    );
  });
});
