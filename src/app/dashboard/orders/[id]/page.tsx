import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OrderDetail from "@/components/marketplace/OrderDetail";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  // Next.js 15+: params is a Promise
  const { id } = await params;

  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (authError) {
      console.error("Error fetching authenticated user in OrderDetailPage:", authError);
    }
    const returnUrl = encodeURIComponent(`/dashboard/orders/${id}`);
    return redirect(`/login?returnUrl=${returnUrl}`);
  }

  // Fetch profile
  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Fetch the specific order
  const { data: order, error: orderError } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (orderError || !order) {
    console.error("Error fetching order:", orderError);
    notFound();
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
        {/* Back navigation */}
        <div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
        </div>

        <OrderDetail order={order} />
      </div>
    </DashboardLayout>
  );
}
