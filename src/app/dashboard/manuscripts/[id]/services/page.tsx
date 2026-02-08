import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getManuscript } from "@/lib/manuscripts";
import ServiceGrid from "@/components/marketplace/ServiceGrid";
import { MARKETPLACE_SERVICES } from "@/lib/marketplace-data";
import { ACTIVE_STATUSES } from "@/lib/service-requests";
import Link from "next/link";

interface ServicesPageProps {
  params: Promise<{ id: string }>;
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/login?returnUrl=/dashboard/manuscripts/${id}/services`);
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

  // Fetch active service requests for this manuscript
  const { data: activeRequests } = await supabase
    .from("service_requests")
    .select("id, service_type, status")
    .eq("manuscript_id", id)
    .in("status", ACTIVE_STATUSES);

  // Create a map of service_type -> request id for quick lookup
  // Note: DB stores service_type with underscores, but service.id uses hyphens
  const activeRequestsByType: Record<string, string> = {};
  if (activeRequests) {
    for (const req of activeRequests) {
      if (req.service_type) {
        // Convert underscores to hyphens to match service.id format
        const normalizedKey = req.service_type.replace(/_/g, "-");
        activeRequestsByType[normalizedKey] = req.id;
      }
    }
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Services</h1>
            <p className="mt-2 text-slate-600">
                Request professional services for this manuscript.
            </p>
        </div>

        <ServiceGrid
          services={MARKETPLACE_SERVICES}
          manuscriptId={id}
          userDisplayName={profile?.display_name || profile?.pen_name || undefined}
          activeRequestsByType={activeRequestsByType}
        />
      </main>
    </div>
  );
}
