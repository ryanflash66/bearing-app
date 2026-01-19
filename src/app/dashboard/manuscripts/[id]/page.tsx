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
        <div className="flex items-center gap-6">
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
            <span>Back</span>
            </a>
            
            <div className="h-4 w-px bg-slate-300"></div>

            <a 
                href={`/dashboard/manuscripts/${id}/marketing`}
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1"
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                Marketing & Launch
            </a>
        </div>
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
        initialMetadata={manuscript.metadata}
      />
    </div>
  );
}

