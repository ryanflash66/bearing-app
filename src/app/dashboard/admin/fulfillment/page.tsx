import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { isSuperAdmin } from "@/lib/super-admin";
import FulfillmentDashboard from "@/components/admin/FulfillmentDashboard";

export default async function AdminFulfillmentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // AC 5.4.1: Only Super Admin can access this page
  const isSuper = await isSuperAdmin(supabase);
  if (!isSuper) {
    redirect("/dashboard");
  }

  // Fetch pending service requests (sorted by oldest first per AC 5.4.1)
  const { data: pendingRequests, error: requestsError } = await supabase
    .from("service_requests")
    .select(`
      *,
      users!service_requests_user_id_fkey (
        email,
        display_name
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // Fetch available ISBN count
  const { data: isbnCountResult } = await supabase.rpc("get_available_isbn_count");
  const availableIsbnCount = isbnCountResult ?? 0;

  // Transform requests to include user info
  const transformedRequests = (pendingRequests || []).map((req) => ({
    ...req,
    user_email: (req.users as { email?: string })?.email,
    user_display_name: (req.users as { display_name?: string })?.display_name,
  }));

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Service Fulfillment
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and fulfill pending service requests from authors.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">Pending Requests</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {transformedRequests.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">ISBN Pool</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {availableIsbnCount}
              <span className="ml-1 text-sm font-normal text-slate-500">
                available
              </span>
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">Oldest Request</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {transformedRequests.length > 0
                ? new Date(transformedRequests[0].created_at).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>

        {requestsError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Error loading requests: {requestsError.message}
          </div>
        )}

        {/* Fulfillment Dashboard (Client Component) */}
        <FulfillmentDashboard
          initialRequests={transformedRequests}
          availableIsbnCount={availableIsbnCount}
        />
      </div>
    </DashboardLayout>
  );
}
