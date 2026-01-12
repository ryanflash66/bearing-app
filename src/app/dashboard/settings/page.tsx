
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="container max-w-4xl py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="text-slate-500">Manage your account settings and preferences.</p>
        </div>

        <div className="grid gap-6">
          {/* Profile Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900">Profile</h3>
              <p className="text-sm text-slate-500">
                Your personal information and contact details.
              </p>
            </div>
            
            <ProfileForm 
              initialDisplayName={profile?.display_name || ""} 
              email={user.email || ""} 
            />
          </div>

          {/* Preferences Card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900">Preferences</h3>
              <p className="text-sm text-slate-500">
                Customize your experience.
              </p>
            </div>
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between space-x-2">
                <label htmlFor="theme" className="flex flex-col space-y-1">
                  <span className="text-sm font-medium leading-none">Theme</span>
                  <span className="font-normal leading-snug text-slate-500">
                    Select your preferred interface theme.
                  </span>
                </label>
                <div className="flex gap-2">
                   <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      System Default
                   </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
