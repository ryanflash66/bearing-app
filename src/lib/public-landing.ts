import { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

export interface PublicBookLanding {
  id: string;
  title: string;
  subtitle: string | null;
  synopsis: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  theme_config: {
    theme: "light" | "dark";
    accent_color?: string;
  };
  owner_user_id: string;
  // Joined author data
  author: {
    id: string;
    display_name: string | null;
    pen_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
}

export interface PublicBookLandingResult {
  book: PublicBookLanding | null;
  error: string | null;
}

/**
 * Fetch a public book landing page by author handle and book slug.
 * Uses React cache() to deduplicate requests between generateMetadata and page component.
 */
export const getPublicBookBySlug = cache(
  async (
    supabase: SupabaseClient,
    authorHandle: string,
    bookSlug: string
  ): Promise<PublicBookLandingResult> => {
    try {
      const normalizedHandle = authorHandle.trim();
      const normalizedSlug = bookSlug.trim().toLowerCase();

      if (!normalizedHandle || !normalizedSlug) {
        return { book: null, error: "Invalid book URL" };
      }

      // First, find the author by pen_name
      const { data: author, error: authorError } = await supabase
        .from("users")
        .select("id, display_name, pen_name, avatar_url, bio")
        .eq("pen_name", normalizedHandle)
        .single();

      if (authorError || !author) {
        return { book: null, error: "Author not found" };
      }

      // Then find the public book with that author and slug
      const { data: manuscript, error: manuscriptError } = await supabase
        .from("manuscripts")
        .select(`
          id,
          title,
          subtitle,
          synopsis,
          cover_image_url,
          is_public,
          theme_config,
          owner_user_id
        `)
        .eq("owner_user_id", author.id)
        .eq("slug", normalizedSlug)
        .eq("is_public", true)
        .is("deleted_at", null)
        .single();

      if (manuscriptError) {
        if (manuscriptError.code === "PGRST116") {
          return { book: null, error: "Book not found" };
        }
        console.error("Error fetching book landing page:", manuscriptError);
        return { book: null, error: manuscriptError.message };
      }

      const book: PublicBookLanding = {
        ...manuscript,
        theme_config: manuscript.theme_config || { theme: "light" },
        author: {
          id: author.id,
          display_name: author.display_name,
          pen_name: author.pen_name,
          avatar_url: author.avatar_url,
          bio: author.bio,
        },
      };

      return { book, error: null };
    } catch (err) {
      console.error("Unexpected error fetching book landing page:", err);
      return { book: null, error: "Failed to load book" };
    }
  }
);

export interface SignupCountResult {
  count: number;
  error: string | null;
}

/**
 * Get the count of signups for a manuscript (for owner dashboard view)
 */
export async function getSignupCount(
  supabase: SupabaseClient,
  manuscriptId: string
): Promise<SignupCountResult> {
  try {
    const { count, error } = await supabase
      .from("book_signups")
      .select("*", { count: "exact", head: true })
      .eq("manuscript_id", manuscriptId);

    if (error) {
      console.error("Error fetching signup count:", error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0, error: null };
  } catch (err) {
    console.error("Unexpected error fetching signup count:", err);
    return { count: 0, error: "Failed to load signup count" };
  }
}

export interface BookSignup {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

export interface SignupListResult {
  signups: BookSignup[];
  error: string | null;
}

/**
 * Get all signups for a manuscript (for owner dashboard view)
 */
export async function getSignupList(
  supabase: SupabaseClient,
  manuscriptId: string
): Promise<SignupListResult> {
  try {
    const { data, error } = await supabase
      .from("book_signups")
      .select("id, email, source, created_at")
      .eq("manuscript_id", manuscriptId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching signups:", error);
      return { signups: [], error: error.message };
    }

    return { signups: (data as BookSignup[]) || [], error: null };
  } catch (err) {
    console.error("Unexpected error fetching signups:", err);
    return { signups: [], error: "Failed to load signups" };
  }
}
