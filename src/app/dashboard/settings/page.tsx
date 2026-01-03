
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getOrCreateProfile } from "@/lib/profile";

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
            <div className="px-6 pb-6 space-y-4">
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                <input 
                  id="email" 
                  value={user.email || ""} 
                  disabled 
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-sm text-slate-500">
                  Your email address is managed through your authentication provider.
                </p>
              </div>
              
              <hr className="my-4 border-slate-200" />
              
              <div className="flex justify-end">
                <button 
                  disabled
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50"
                >
                  Save Changes (Coming Soon)
                </button>
              </div>
            </div>
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
                <button 
                  disabled
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50"
                >
                  System Default
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
