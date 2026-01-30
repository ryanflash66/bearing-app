import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { MARKETPLACE_SERVICES } from "@/lib/marketplace-data";
import ServiceGrid from "@/components/marketplace/ServiceGrid";
import DesignerBoard from "@/components/marketplace/DesignerBoard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SubscriptionBanner, { SubscriptionTier } from "@/components/marketplace/SubscriptionBanner";

export default async function MarketplacePage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (authError) {
      console.error("Error fetching authenticated user in MarketplacePage:", authError);
    }
    const returnUrl = encodeURIComponent("/dashboard/marketplace");
    return redirect(`/login?returnUrl=${returnUrl}`);
  }

  // Fetch profile
  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Determine view based on role
  // AC: "Designer" (mapped to support_agent) sees Task Board instead of Purchase view
  // Also showing to admins for visibility
  const isDesignerOrAdmin =
    profile?.role === "support_agent" ||
    profile?.role === "super_admin";

  // Determine subscription tier
  // TODO: Replace mock logic with real subscription tier lookup
  const tierOverride = process.env.NEXT_PUBLIC_SUBSCRIPTION_TIER?.toLowerCase();
  const subscriptionTier: SubscriptionTier =
    tierOverride === "pro" || tierOverride === "enterprise" || tierOverride === "free"
      ? (tierOverride as SubscriptionTier)
      : "free";

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
          <h2 className="text-2xl font-bold text-slate-900">Service Marketplace</h2>
          <p className="mt-1 text-slate-600">
            {isDesignerOrAdmin
              ? "Manage service requests and tasks."
              : "Browse and request professional services for your book."}
          </p>
        </div>

        {/* Subscription Banner - shown only for regular users */}
        {!isDesignerOrAdmin && (
          <SubscriptionBanner tier={subscriptionTier} />
        )}

        {isDesignerOrAdmin ? (
          <DesignerBoard />
        ) : (
          <ServiceGrid services={MARKETPLACE_SERVICES} />
        )}
      </div>
    </DashboardLayout>
  );
}
