
import CreateTicketForm from "@/components/support/CreateTicketForm";
import DashboardLayout from "@/components/layout/DashboardLayout"; // Assuming layout usage
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";

export default async function CreateTicketPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  
  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Contact Support</h1>
        <CreateTicketForm />
      </div>
    </DashboardLayout>
  );
}
