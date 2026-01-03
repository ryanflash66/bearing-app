import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getUserAccounts } from "@/lib/account";
import { verifyAdminAccess } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?returnUrl=/dashboard/admin");
  }

  // Get user profile
  const { profile, error: profileError } = await getOrCreateProfile(
    supabase,
    user.id,
    user.email || ""
  );

  if (profileError || !profile) {
    redirect("/dashboard");
  }

  // Get user's account
  const { accounts } = await getUserAccounts(supabase, profile.id);
  const primaryAccount = accounts[0];

  if (!primaryAccount) {
    redirect("/dashboard");
  }

  // Verify admin access - this enforces the admin-only guard
  const { isAdmin, error: adminError } = await verifyAdminAccess(
    supabase,
    primaryAccount.id,
    profile.id
  );

  if (!isAdmin || adminError) {
    // AC 1.4.1: Non-admin receives 403-style denial or redirect to dashboard
    redirect("/dashboard?error=access_denied");
  }

  return <>{children}</>;
}

