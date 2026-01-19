import { SupabaseClient } from "@supabase/supabase-js";
import { getPublicAuthorProfileByHandle, PublicAuthorProfile } from "./public-profile";

export interface PublicBook {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  synopsis: string | null;
  cover_image_url: string | null;
  theme_config: any; // JSONB
  is_public: boolean;
  owner_user_id: string;
}

export interface PublicBookResult {
  book: PublicBook | null;
  author: PublicAuthorProfile | null;
  error: string | null;
}

export async function getPublicBookBySlug(
  supabase: SupabaseClient,
  handle: string,
  slug: string
): Promise<PublicBookResult> {
  if (!handle || !slug) {
    return { book: null, author: null, error: "Author handle and book slug are required" };
  }

  // 1. Fetch Author
  const { profile: author, error: authorError } = await getPublicAuthorProfileByHandle(supabase, handle);

  if (authorError || !author) {
    return { book: null, author: null, error: authorError || "Author not found" };
  }

  // 2. Fetch Book (Manuscript)
  try {
    const { data, error } = await supabase
      .from("manuscripts")
      .select("id, title, slug, subtitle, synopsis, cover_image_url, theme_config, is_public, owner_user_id")
      .eq("owner_user_id", author.id)
      .eq("slug", slug)
      .eq("is_public", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { book: null, author, error: "Book not found" };
      }
      console.error("Error fetching public book:", error);
      return { book: null, author, error: error.message };
    }

    return { book: data as PublicBook, author, error: null };
  } catch (err) {
    console.error("Unexpected error fetching public book:", err);
    return { book: null, author, error: "Failed to load book" };
  }
}
