import { createClient } from "@supabase/supabase-js";
import { getPublicBookBySlug } from "@/lib/public-book";

// Mock Supabase client
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockRpc = jest.fn();

const mockSupabase = {
  from: jest.fn(() => ({
    select: mockSelect,
  })),
  rpc: mockRpc,
} as unknown as ReturnType<typeof createClient>;

describe("getPublicBookBySlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle }); // Chained for users query
  });

  it("returns error if handle or slug is missing", async () => {
    const result = await getPublicBookBySlug(mockSupabase, "", "some-slug");
    expect(result.error).toBe("Author handle and book slug are required");
    expect(result.book).toBeNull();

    const result2 = await getPublicBookBySlug(mockSupabase, "handle", "");
    expect(result2.error).toBe("Author handle and book slug are required");
    expect(result2.book).toBeNull();
  });

  it("returns error if author not found", async () => {
    // Mock user fetch failure
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

    // Setup chain for user fetch
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ single: mockSingle });

    const result = await getPublicBookBySlug(mockSupabase, "nonexistent", "book-slug");
    
    expect(result.error).toBe("Author not found");
    expect(result.book).toBeNull();
  });

  it("returns book if author and book found", async () => {
    const mockAuthor = { id: "user-123", pen_name: "testauthor" };
    const mockBook = { 
      id: "book-123", 
      title: "Test Book", 
      slug: "test-book",
      is_public: true,
      owner_user_id: "user-123"
    };

    // Mock user fetch success
    mockSingle.mockResolvedValueOnce({ data: mockAuthor, error: null });
    
    // Mock book fetch success
    // Chain: from('manuscripts').select(...).eq('owner_user_id', ...).eq('slug', ...).eq('is_public', true).single()
    const mockBookSingle = jest.fn().mockResolvedValue({ data: mockBook, error: null });
    const mockBookEq3 = { single: mockBookSingle };
    const mockBookEq2 = { eq: jest.fn().mockReturnValue(mockBookEq3) };
    const mockBookEq1 = { eq: jest.fn().mockReturnValue(mockBookEq2) };
    const mockBookSelect = { eq: jest.fn().mockReturnValue(mockBookEq1) };
    
    // Reset from mock to handle second call
    mockSupabase.from = jest.fn()
      .mockReturnValueOnce({ select: mockSelect }) // 1st call: users
      .mockReturnValueOnce({ select: jest.fn().mockReturnValue(mockBookSelect) }); // 2nd call: manuscripts

    // Setup 1st call (users)
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ single: mockSingle });

    const result = await getPublicBookBySlug(mockSupabase, "testauthor", "test-book");

    expect(result.error).toBeNull();
    expect(result.book).toEqual(mockBook);
    expect(result.author).toEqual(mockAuthor);
  });
});
