/**
 * Unit tests for public profile data access
 * Story 6.2: Public Author Profile/Blog
 */

import { getPublicAuthorProfileByHandle, getPublishedBooksByAuthor } from "@/lib/public-profile";

describe("public-profile", () => {
  describe("getPublicAuthorProfileByHandle", () => {
    it("returns profile when found", async () => {
      const mockProfile = {
        id: "user-123",
        display_name: "Jane Doe",
        pen_name: "jane-doe",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
            }),
          }),
        }),
      };

      const result = await getPublicAuthorProfileByHandle(mockSupabase as never, "jane-doe");

      expect(result.profile).toEqual(mockProfile);
      expect(result.error).toBeNull();
    });

    it("returns not found when profile is missing", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116", message: "No rows found" },
              }),
            }),
          }),
        }),
      };

      const result = await getPublicAuthorProfileByHandle(mockSupabase as never, "missing");

      expect(result.profile).toBeNull();
      expect(result.error).toBe("Author not found");
    });
  });

  describe("getPublishedBooksByAuthor", () => {
    it("returns published books for author", async () => {
      const mockBooks = [
        { id: "m1", title: "The First Book", updated_at: "2026-01-01" },
        { id: "m2", title: "The Second Book", updated_at: "2026-01-02" },
      ];

      const queryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockBooks, error: null }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(queryChain),
      };

      const result = await getPublishedBooksByAuthor(mockSupabase as never, "user-123");

      expect(result.books).toEqual(mockBooks);
      expect(result.error).toBeNull();
    });

    it("returns error when query fails", async () => {
      const queryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(queryChain),
      };

      const result = await getPublishedBooksByAuthor(mockSupabase as never, "user-123");

      expect(result.books).toEqual([]);
      expect(result.error).toBe("DB error");
    });
  });
});
