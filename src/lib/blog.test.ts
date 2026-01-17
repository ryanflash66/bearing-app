import { generateSlug, createBlogPost } from './blog';
import { SupabaseClient } from '@supabase/supabase-js';

// Create a builder object that supports chaining
const mockBuilder = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  eq: jest.fn(),
  neq: jest.fn(),
  is: jest.fn(),
  single: jest.fn(),
};

// Setup chaining - methods return the builder itself
mockBuilder.select.mockReturnValue(mockBuilder);
mockBuilder.insert.mockReturnValue(mockBuilder);
mockBuilder.update.mockReturnValue(mockBuilder);
mockBuilder.eq.mockReturnValue(mockBuilder);
mockBuilder.neq.mockReturnValue(mockBuilder);
mockBuilder.is.mockReturnValue(mockBuilder);

const mockFrom = jest.fn().mockReturnValue(mockBuilder);

const mockSupabase = {
  from: mockFrom,
} as unknown as SupabaseClient;

describe('Blog Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset default behaviors if needed, though mostly handled by mockReturnValue above.
    // Ensure single() returns a default safe value/promise
    mockBuilder.single.mockResolvedValue({ data: null, error: null });
  });

  describe('generateSlug', () => {
    it('should lowercase and hyphenate titles', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Hello @ World!')).toBe('hello-world');
    });

    it('should handle duplicate spaces', () => {
      expect(generateSlug('Hello   World')).toBe('hello-world');
    });
    
    it('should trim whitespace', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world');
    });
  });

  describe('createBlogPost', () => {
    it('should create a blog post with generated slug', async () => {
      const input = {
        account_id: 'acc-123',
        owner_user_id: 'user-123',
        title: 'My First Post',
      };

      const mockPost = {
        id: 'post-1',
        ...input,
        slug: 'my-first-post',
        status: 'draft',
      };

      // Mock sequence of single() calls
      // 1. generateUniqueSlug -> select()...single() -> returns null (not found = unique)
      // 2. insert()...single() -> returns created post
      mockBuilder.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: mockPost, error: null });

      const result = await createBlogPost(mockSupabase, input);

      expect(result.error).toBeNull();
      expect(result.post).toEqual(mockPost);
      expect(mockFrom).toHaveBeenCalledWith('blog_posts');
      // Check insert was called with correct slug
      expect(mockBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'my-first-post',
        status: 'draft',
      }));
    });

    it('should handle slug collision by appending suffix', async () => {
       const input = {
        account_id: 'acc-123',
        owner_user_id: 'user-123',
        title: 'Collision Post',
      };
      
      const mockPost = {
          ...input,
          slug: 'collision-post-1',
          status: 'draft',
      };

      // Mock sequence:
      // 1. generateUniqueSlug first check -> returns existing data (collision)
      // 2. generateUniqueSlug second check -> returns null (unique)
      // 3. insert -> returns new post
      mockBuilder.single
        .mockResolvedValueOnce({ data: { id: 'existing' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: mockPost, error: null });

      await createBlogPost(mockSupabase, input);

      expect(mockBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'collision-post-1',
      }));
    });
  });
});
