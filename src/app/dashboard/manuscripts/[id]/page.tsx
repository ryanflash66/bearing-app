import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getManuscript } from "@/lib/manuscripts";
import ManuscriptEditorWrapper from "./ManuscriptEditorWrapper";

interface ManuscriptPageProps {
  params: Promise<{ id: string }>;
}

export default async function ManuscriptPage({ params }: ManuscriptPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/login?returnUrl=/dashboard/manuscripts/${id}`);
  }

  // Get user profile
  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Get the manuscript
  const { manuscript, error } = await getManuscript(supabase, id);

  if (error || !manuscript) {
    return redirect("/dashboard/manuscripts?error=not_found");
  }

  // Check if manuscript is deleted
  if (manuscript.deleted_at) {
    return redirect("/dashboard/manuscripts?error=deleted");
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Navigation header */}
      <nav className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <a
          href="/dashboard/manuscripts"
          className="flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back to Manuscripts</span>
        </a>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>
            Logged in as {profile?.display_name || user.email}
          </span>
        </div>
      </nav>

      {/* Editor */}
      <ManuscriptEditorWrapper
        manuscriptId={manuscript.id}
        initialTitle={manuscript.title}
        initialContent={manuscript.content_text}
        initialUpdatedAt={manuscript.updated_at}
      />
    </div>
  );
}

