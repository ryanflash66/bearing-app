import { SupabaseClient } from "@supabase/supabase-js";

export interface PublicAuthorProfile {
  id: string;
  display_name: string | null;
  pen_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface PublicAuthorProfileResult {
  profile: PublicAuthorProfile | null;
  error: string | null;
}

export interface PublicBookSummary {
  id: string;
  title: string;
  updated_at: string;
  created_at?: string;
}

export interface PublicBookListResult {
  books: PublicBookSummary[];
  error: string | null;
}

export async function getPublicAuthorProfileByHandle(
  supabase: SupabaseClient,
  handle: string
): Promise<PublicAuthorProfileResult> {
  try {
    const normalizedHandle = handle.trim();
    if (!normalizedHandle) {
      return { profile: null, error: "Author not found" };
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, display_name, pen_name, avatar_url, bio")
      .eq("pen_name", normalizedHandle)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { profile: null, error: "Author not found" };
      }
      console.error("Error fetching public author profile:", error);
      return { profile: null, error: error.message };
    }

    return { profile: data as PublicAuthorProfile, error: null };
  } catch (err) {
    console.error("Unexpected error fetching public author profile:", err);
    return { profile: null, error: "Failed to load author profile" };
  }
}

export async function getPublishedBooksByAuthor(
  supabase: SupabaseClient,
  authorId: string
): Promise<PublicBookListResult> {
  try {
    const { data, error } = await supabase
      .from("manuscripts")
      .select("id, title, updated_at, created_at")
      .eq("owner_user_id", authorId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching published books:", error);
      return { books: [], error: error.message };
    }

    return { books: (data as PublicBookSummary[]) || [], error: null };
  } catch (err) {
    console.error("Unexpected error fetching published books:", err);
    return { books: [], error: "Failed to load published books" };
  }
}
