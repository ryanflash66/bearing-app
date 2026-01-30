
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login?returnUrl=/dashboard/settings");
  }

  // Get user profile for the layout
  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-slate-500">
          Your personal information and contact details.
        </p>
      </div>
      <div className="h-px bg-slate-200" />
      
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
            <ProfileForm 
              initialDisplayName={profile?.display_name || ""} 
              email={user.email || ""} 
            />
        </div>
      </div>
    </div>
  );
}
