import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { createManuscript } from "@/lib/manuscripts";
import { getFirstUserAccount } from "@/lib/account";

/**
 * Create a new manuscript and redirect to editor
 * AC 2.1.3: A draft manuscript row is created and autosave begins immediately
 */
export default async function NewManuscriptPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login?returnUrl=/dashboard/manuscripts/new");
  }

  // Get user profile to get internal user id
  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  if (!profile) {
    return redirect("/dashboard?error=profile_required");
  }

  // Get user's account
  const { account, error: accountError } = await getFirstUserAccount(supabase, user.id);

  if (accountError || !account) {
    return redirect("/dashboard?error=account_required");
  }

  // Create the draft manuscript immediately (AC 2.1.3)
  const { manuscript, error: createError } = await createManuscript(supabase, {
    account_id: account.id,
    owner_user_id: profile.id,
    title: "Untitled",
  });

  if (createError || !manuscript) {
    console.error("Failed to create manuscript:", createError);
    return redirect("/dashboard/manuscripts?error=create_failed");
  }

  // Redirect to the editor with the new manuscript
  return redirect(`/dashboard/manuscripts/${manuscript.id}`);
}

