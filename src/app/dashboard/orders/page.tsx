import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OrderList from "@/components/marketplace/OrderList";

export default async function MyOrdersPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (authError) {
      console.error("Error fetching authenticated user in MyOrdersPage:", authError);
    }
    const returnUrl = encodeURIComponent("/dashboard/orders");
    return redirect(`/login?returnUrl=${returnUrl}`);
  }

  // Fetch profile
  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Fetch user's service requests with manuscript details (AC 8.13.1, 8.13.5)
  const { data: orders, error: ordersError } = await supabase
    .from("service_requests")
    .select("*, manuscripts(id, title)")
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("Error fetching orders:", ordersError);
  }

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Orders</h2>
          <p className="mt-1 text-slate-600">
            View your past service requests and track their status.
          </p>
        </div>

        {ordersError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800">Unable to load orders</h3>
            <p className="mt-2 text-sm text-red-700">
              We couldn&apos;t fetch your order history. Please try refreshing the page.
            </p>
          </div>
        ) : (
          <OrderList orders={orders || []} />
        )}
      </div>
    </DashboardLayout>
  );
}
