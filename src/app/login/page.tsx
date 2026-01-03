import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";

interface LoginPageProps {
  searchParams: Promise<{
    returnUrl?: string;
    message?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnUrl = params.returnUrl;
  const message = params.message;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500">
            <svg className="h-8 w-8 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-slate-900">
            Sign in to Bearing
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-amber-600 hover:text-amber-500">
              Sign up
            </Link>
          </p>
        </div>

        {/* Session expired message */}
        {message === "session_expired" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm font-medium text-amber-800">
                Your session has expired. Please sign in again.
              </p>
            </div>
          </div>
        )}

        <LoginForm returnUrl={returnUrl} />

        <div className="text-center">
          <Link
            href="/login/forgot-password"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}
