import { SupabaseClient } from "@supabase/supabase-js";

export interface PublicBlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicBlogPostListResult {
  posts: PublicBlogPostSummary[];
  error: string | null;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface PublicBlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  content_json: Record<string, unknown>;
  content_text: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicBlogPostResult {
  post: PublicBlogPost | null;
  error: string | null;
}

export async function getPublishedBlogPostsByAuthor(
  supabase: SupabaseClient,
  authorId: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<PublicBlogPostListResult> {
  const pageSize = Math.max(1, options.pageSize ?? 10);
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, error, count } = await supabase
      .from("blog_posts")
      .select(
        "id, title, slug, excerpt, published_at, created_at, updated_at",
        { count: "exact" }
      )
      .eq("owner_user_id", authorId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching published blog posts:", error);
      return {
        posts: [],
        error: error.message,
        totalCount: 0,
        totalPages: 1,
        page,
        pageSize,
      };
    }

    const totalCount = typeof count === "number" ? count : data?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      posts: (data as PublicBlogPostSummary[]) || [],
      error: null,
      totalCount,
      totalPages,
      page,
      pageSize,
    };
  } catch (err) {
    console.error("Unexpected error fetching published blog posts:", err);
    return {
      posts: [],
      error: "Failed to load blog posts",
      totalCount: 0,
      totalPages: 1,
      page,
      pageSize,
    };
  }
}

export async function getPublishedBlogPostBySlug(
  supabase: SupabaseClient,
  authorId: string,
  slug: string
): Promise<PublicBlogPostResult> {
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, title, slug, status, content_json, content_text, excerpt, published_at, created_at, updated_at"
      )
      .eq("owner_user_id", authorId)
      .eq("slug", slug)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { post: null, error: "Post not found" };
      }
      console.error("Error fetching published blog post:", error);
      return { post: null, error: error.message };
    }

    if (data?.status !== "published") {
      return { post: null, error: "Post not found" };
    }

    return { post: data as PublicBlogPost, error: null };
  } catch (err) {
    console.error("Unexpected error fetching published blog post:", err);
    return { post: null, error: "Failed to load blog post" };
  }
}
