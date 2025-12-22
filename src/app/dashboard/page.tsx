import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MFAEnrollment from "@/components/auth/MFAEnrollment";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Check enrollment status (simple check)
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasMFA = factors?.totp?.some(f => f.status === 'verified');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
       <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Welcome, {user.email}</h1>
          <p className="mb-4">You are securely logged in.</p>
          
          <div className="border-t pt-6 mt-6">
             <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
             {hasMFA ? (
                 <div className="text-green-600 font-medium">✓ Two-Factor Authentication is enabled</div>
             ) : (
                 <MFAEnrollment />
             )}
          </div>
          
          <form action="/auth/signout" method="post" className="mt-8">
              <button 
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700" 
                type="submit"
              >
                  Sign out
              </button>
          </form>
       </div>
    </div>
  );
}
