
import { POST } from "@/app/api/manuscripts/upload/route";

// Mock Supabase
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "user-id" } },
        error: null,
      }),
    },
  }),
}));

// Mock Mammoth and PDF Parse
jest.mock("mammoth", () => ({
  convertToHtml: jest.fn(),
}));

jest.mock("pdf-parse", () => {
  return jest.fn();
});

describe("POST /api/manuscripts/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    const { createClient } = require("@/utils/supabase/server");
    createClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Unauthorized" },
        }),
      },
    });

    const req = {
      formData: jest.fn(),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 if no file is uploaded", async () => {
    const formData = new FormData();
    const req = {
      formData: jest.fn().mockResolvedValue(formData),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("No file uploaded");
  });

  it("should handle DOCX file upload", async () => {
    const mammoth = require("mammoth");
    mammoth.convertToHtml.mockResolvedValue({
      value: "<h1>Chapter 1</h1><p>Content</p>",
      messages: [],
    });

    const mockFile = {
        name: "test.docx",
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from("dummy docx"))
    };

    const mockFormData = {
        get: jest.fn().mockReturnValue(mockFile)
    };

    const req = {
        formData: jest.fn().mockResolvedValue(mockFormData),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.chapters).toBeDefined();
    expect(mammoth.convertToHtml).toHaveBeenCalled();
  });

  it("should handle PDF file upload", async () => {
    const pdf = require("pdf-parse");
    pdf.mockResolvedValue({
      text: "PDF Content",
    });

    const mockFile = {
        name: "test.pdf",
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from("dummy pdf"))
    };

    const mockFormData = {
        get: jest.fn().mockReturnValue(mockFile)
    };

    const req = {
        formData: jest.fn().mockResolvedValue(mockFormData),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.chapters[0].content).toBe("PDF Content");
  });

  it("should handle Markdown file upload", async () => {
    const content = "# Chapter 1\nMarkdown Content";
    const mockFile = {
        name: "test.md",
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from(content))
    };

    const mockFormData = {
        get: jest.fn().mockReturnValue(mockFile)
    };

    const req = {
        formData: jest.fn().mockResolvedValue(mockFormData),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.chapters).toHaveLength(1);
    expect(data.chapters[0].title).toBe("Chapter 1");
    expect(data.chapters[0].content.trim()).toBe("Markdown Content");
  });
});
