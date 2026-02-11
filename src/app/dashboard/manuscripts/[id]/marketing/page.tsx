import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getManuscript } from "@/lib/manuscripts";
import MarketingDashboard from "@/components/marketing/MarketingDashboard";
import Link from "next/link";

interface MarketingPageProps {
  params: Promise<{ id: string }>;
}

export default async function MarketingPage({ params }: MarketingPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/login?returnUrl=/dashboard/manuscripts/${id}/marketing`);
  }

  // Get user profile
  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Get the manuscript
  const { manuscript, error } = await getManuscript(supabase, id);

  if (error || !manuscript) {
    return redirect("/dashboard/manuscripts?error=not_found");
  }

  // Verify ownership (owner_user_id is the users table PK, not the auth UUID)
  if (manuscript.owner_user_id !== profile?.id) {
     return redirect("/dashboard/manuscripts?error=unauthorized");
  }

  // Check if manuscript is deleted
  if (manuscript.deleted_at) {
    return redirect("/dashboard/manuscripts?error=deleted");
  }

  // Fetch signups
  const { data: signups, error: signupsError } = await supabase
    .from("book_signups")
    .select("id, email, created_at, source")
    .eq("manuscript_id", id)
    .order("created_at", { ascending: false });

  if (signupsError) {
      console.error("Error fetching signups:", signupsError);
  }

  return (
    <div className="min-h-screen bg-stone-50">
       {/* Simple Navigation */}
       <nav className="bg-white border-b border-stone-200 px-4 py-3 mb-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link
                href={`/dashboard/manuscripts/${id}`}
                className="text-stone-600 hover:text-stone-900 text-sm flex items-center gap-1"
                >
                    &larr; Back to Editor
                </Link>
                <span className="text-stone-300">|</span>
                <span className="font-semibold text-stone-900">{manuscript.title}</span>
            </div>
            <div className="text-sm text-stone-500">
                Logged in as {profile?.display_name || user.email}
            </div>
        </div>
      </nav>

      <MarketingDashboard 
        manuscript={manuscript} 
        signups={signups || []} 
        userHandle={profile?.pen_name || "user"}
      />
    </div>
  );
}
