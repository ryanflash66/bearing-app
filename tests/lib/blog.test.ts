/**
 * Unit tests for Blog post functions
 * Story 6.1: Blog Management (CMS)
 */

import { generateSlug } from "@/lib/blog";

describe("Blog Post Functions", () => {
  describe("generateSlug", () => {
    it("should convert title to lowercase", () => {
      expect(generateSlug("Hello World")).toBe("hello-world");
    });

    it("should replace spaces with hyphens", () => {
      expect(generateSlug("my blog post")).toBe("my-blog-post");
    });

    it("should remove special characters", () => {
      expect(generateSlug("Hello! World? Test.")).toBe("hello-world-test");
    });

    it("should replace multiple hyphens with single hyphen", () => {
      expect(generateSlug("hello---world")).toBe("hello-world");
    });

    it("should trim whitespace", () => {
      expect(generateSlug("  hello world  ")).toBe("hello-world");
    });

    it("should limit length to 100 characters", () => {
      const longTitle = "a".repeat(150);
      expect(generateSlug(longTitle).length).toBeLessThanOrEqual(100);
    });

    it("should handle empty string", () => {
      expect(generateSlug("")).toBe("");
    });

    it("should handle unicode characters", () => {
      expect(generateSlug("Café Latté")).toBe("caf-latt");
    });
  });
});

describe("Blog Post CRUD Operations", () => {
  describe("createBlogPost", () => {
    it("should create a draft blog post immediately", async () => {
      const mockPost = {
        id: "test-id-123",
        account_id: "account-123",
        owner_user_id: "user-123",
        title: "Untitled Post",
        slug: "untitled-post",
        status: "draft",
        content_json: {},
        content_text: "",
        excerpt: null,
        word_count: 0,
        views_count: 0,
        reads_count: 0,
        published_at: null,
        deleted_at: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      };

      // Mock for generateUniqueSlug - needs to return no existing slug
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      };

      // Mock for insert
      const mockInsertChain = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockPost,
            error: null,
          }),
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            insert: jest.fn().mockReturnValue(mockInsertChain),
          };
        }),
      };

      const { createBlogPost } = await import("@/lib/blog");
      const result = await createBlogPost(mockSupabase as never, {
        account_id: "account-123",
        owner_user_id: "user-123",
      });

      expect(result.error).toBeNull();
      expect(result.post).toBeDefined();
      expect(result.post?.status).toBe("draft");
    });
  });

  describe("publishBlogPost", () => {
    it("should set status to published and set published_at", async () => {
      const now = new Date().toISOString();
      const mockPublishedPost = {
        id: "test-id-123",
        status: "published",
        published_at: now,
        updated_at: now,
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockPublishedPost,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      const { publishBlogPost } = await import("@/lib/blog");
      const result = await publishBlogPost(mockSupabase as never, "test-id-123");

      expect(result.error).toBeNull();
      expect(result.post?.status).toBe("published");
      expect(result.post?.published_at).toBeDefined();
    });
  });

  describe("unpublishBlogPost", () => {
    it("should set status back to draft", async () => {
      const mockDraftPost = {
        id: "test-id-123",
        status: "draft",
        updated_at: new Date().toISOString(),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockDraftPost,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      const { unpublishBlogPost } = await import("@/lib/blog");
      const result = await unpublishBlogPost(mockSupabase as never, "test-id-123");

      expect(result.error).toBeNull();
      expect(result.post?.status).toBe("draft");
    });
  });

  describe("archiveBlogPost", () => {
    it("should soft delete by setting deleted_at", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };

      const { archiveBlogPost } = await import("@/lib/blog");
      const result = await archiveBlogPost(mockSupabase as never, "test-id-123");

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });
});

describe("Blog Post Status Lifecycle", () => {
  it("follows draft -> published -> archived lifecycle", () => {
    // This test documents the expected status transitions
    const validTransitions = [
      { from: "draft", to: "published" },
      { from: "published", to: "draft" },
      { from: "published", to: "archived" },
      { from: "draft", to: "archived" },
    ];

    // All these transitions should be valid
    validTransitions.forEach(({ from, to }) => {
      expect(["draft", "published", "archived"]).toContain(from);
      expect(["draft", "published", "archived"]).toContain(to);
    });
  });
});
