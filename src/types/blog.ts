/**
 * Blog Post type definitions
 * Story 6.1: Blog Management (CMS)
 */

export type BlogPostStatus = "draft" | "published" | "archived";

export interface BlogPost {
  id: string;
  account_id: string;
  owner_user_id: string;
  title: string;
  slug: string;
  status: BlogPostStatus;
  content_json: Record<string, unknown>;
  content_text: string;
  excerpt: string | null;
  word_count: number;
  views_count: number;
  reads_count: number;
  published_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBlogPostInput {
  account_id: string;
  owner_user_id: string;
  title?: string;
  slug?: string;
}

export interface UpdateBlogPostInput {
  title?: string;
  slug?: string;
  content_json?: Record<string, unknown>;
  content_text?: string;
  excerpt?: string;
  status?: BlogPostStatus;
}

export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  status: BlogPostStatus;
  excerpt: string | null;
  word_count: number;
  views_count: number;
  reads_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
