/**
 * Tests for public book landing page data access
 * Story 7.4: Coming Soon & Landing Pages
 */

import { getPublicBookBySlug, getSignupCount, getSignupList } from "@/lib/public-landing";

// Mock the React cache function
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

describe("getPublicBookBySlug", () => {
  const mockSupabase = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns book with author data when found", async () => {
    const mockAuthor = {
      id: "author-123",
      display_name: "Jane Author",
      pen_name: "jane-writes",
      avatar_url: "https://example.com/avatar.jpg",
      bio: "An author bio",
    };

    const mockManuscript = {
      id: "book-456",
      title: "My Great Book",
      subtitle: "A Subtitle",
      synopsis: "A synopsis",
      cover_image_url: "https://example.com/cover.jpg",
      is_public: true,
      theme_config: { theme: "dark", accent_color: "#ff0000" },
      owner_user_id: "author-123",
    };

    // Mock author query
    const authorQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockAuthor, error: null }),
    };

    // Mock manuscript query
    const manuscriptQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockManuscript, error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "users") return authorQueryChain;
      if (table === "manuscripts") return manuscriptQueryChain;
      return null;
    });

    const result = await getPublicBookBySlug(
      mockSupabase as any,
      "jane-writes",
      "my-great-book"
    );

    expect(result.error).toBeNull();
    expect(result.book).not.toBeNull();
    expect(result.book?.title).toBe("My Great Book");
    expect(result.book?.author?.display_name).toBe("Jane Author");
    expect(result.book?.theme_config.theme).toBe("dark");
  });

  it("returns null when author not found", async () => {
    const authorQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    };

    mockSupabase.from.mockReturnValue(authorQueryChain);

    const result = await getPublicBookBySlug(
      mockSupabase as any,
      "nonexistent",
      "book-slug"
    );

    expect(result.book).toBeNull();
    expect(result.error).toBe("Author not found");
  });

  it("returns null when book not found", async () => {
    const mockAuthor = {
      id: "author-123",
      display_name: "Jane Author",
      pen_name: "jane-writes",
    };

    const authorQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockAuthor, error: null }),
    };

    const manuscriptQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" }
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "users") return authorQueryChain;
      if (table === "manuscripts") return manuscriptQueryChain;
      return null;
    });

    const result = await getPublicBookBySlug(
      mockSupabase as any,
      "jane-writes",
      "nonexistent-book"
    );

    expect(result.book).toBeNull();
    expect(result.error).toBe("Book not found");
  });

  it("returns error for empty handle or slug", async () => {
    const result1 = await getPublicBookBySlug(mockSupabase as any, "", "slug");
    expect(result1.book).toBeNull();
    expect(result1.error).toBe("Invalid book URL");

    const result2 = await getPublicBookBySlug(mockSupabase as any, "handle", "");
    expect(result2.book).toBeNull();
    expect(result2.error).toBe("Invalid book URL");
  });

  it("uses default light theme when theme_config is null", async () => {
    const mockAuthor = {
      id: "author-123",
      display_name: "Jane Author",
      pen_name: "jane-writes",
    };

    const mockManuscript = {
      id: "book-456",
      title: "My Book",
      theme_config: null, // No config set
      owner_user_id: "author-123",
    };

    const authorQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockAuthor, error: null }),
    };

    const manuscriptQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockManuscript, error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "users") return authorQueryChain;
      if (table === "manuscripts") return manuscriptQueryChain;
      return null;
    });

    const result = await getPublicBookBySlug(
      mockSupabase as any,
      "jane-writes",
      "my-book"
    );

    expect(result.book?.theme_config.theme).toBe("light");
  });
});

describe("getSignupCount", () => {
  const mockSupabase = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns count of signups", async () => {
    const queryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ count: 42, error: null }),
    };
    mockSupabase.from.mockReturnValue(queryChain);

    const result = await getSignupCount(mockSupabase as any, "manuscript-id");

    expect(result.count).toBe(42);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("book_signups");
  });

  it("returns 0 when no signups", async () => {
    const queryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ count: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(queryChain);

    const result = await getSignupCount(mockSupabase as any, "manuscript-id");

    expect(result.count).toBe(0);
    expect(result.error).toBeNull();
  });
});

describe("getSignupList", () => {
  const mockSupabase = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns list of signups ordered by date", async () => {
    const mockSignups = [
      { id: "1", email: "first@example.com", source: "landing_page", created_at: "2026-01-20T10:00:00Z" },
      { id: "2", email: "second@example.com", source: "widget", created_at: "2026-01-19T10:00:00Z" },
    ];

    const queryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockSignups, error: null }),
    };
    mockSupabase.from.mockReturnValue(queryChain);

    const result = await getSignupList(mockSupabase as any, "manuscript-id");

    expect(result.signups).toHaveLength(2);
    expect(result.signups[0].email).toBe("first@example.com");
    expect(result.error).toBeNull();
  });

  it("returns empty array when no signups", async () => {
    const queryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(queryChain);

    const result = await getSignupList(mockSupabase as any, "manuscript-id");

    expect(result.signups).toEqual([]);
    expect(result.error).toBeNull();
  });
});
