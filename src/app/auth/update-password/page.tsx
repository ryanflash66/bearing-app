import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If not logged in, redirect to login (the email link usually logs you in first)
    return redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
