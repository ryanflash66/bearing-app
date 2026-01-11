
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // CONSOLIDATION: Redirect to the unified Agent Dashboard
  // This page is preserved only to catch legacy bookmarks or links
  redirect("/dashboard/support");
}
