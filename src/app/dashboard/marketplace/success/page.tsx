import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const supabase = await createClient();
  const { session_id } = await searchParams;

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const returnPath = session_id
      ? `/dashboard/marketplace/success?session_id=${session_id}`
      : "/dashboard/marketplace/success";
    const returnUrl = encodeURIComponent(returnPath);
    return redirect(`/login?returnUrl=${returnUrl}`);
  }

  // Fetch profile
  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md text-center">
          {/* Success Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Thank You Message */}
          <h1 className="mb-3 text-2xl font-bold text-slate-900">
            Thank You for Your Purchase!
          </h1>
          <p className="mb-6 text-slate-600">
            Your ISBN registration request has been received. Our team will process your order and assign your ISBN within 24-48 hours.
          </p>

          {/* Order Details */}
          {session_id && (
            <div className="mb-6 rounded-lg bg-slate-50 p-4 text-left">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Order Reference</h2>
              <p className="font-mono text-xs text-slate-500 break-all">{session_id}</p>
            </div>
          )}

          {/* What's Next */}
          <div className="mb-8 rounded-lg border border-blue-100 bg-blue-50 p-4 text-left">
            <h2 className="mb-2 text-sm font-semibold text-blue-800">What happens next?</h2>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>You&apos;ll receive an email confirmation shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Your ISBN will be assigned within 24-48 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>We&apos;ll notify you once your ISBN is ready</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard/marketplace"
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back to Marketplace
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          </div>

          {/* My Orders Placeholder */}
          {/* My Orders Link */}
          <div className="mt-6 text-xs text-slate-500">
            <Link href="/dashboard/orders" className="hover:text-slate-700 hover:underline">
              View your orders
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
