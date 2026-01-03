import Link from "next/link";

interface UpsellBannerProps {
  status: "flagged" | "upsell_required";
  onDismiss?: () => void;
}

export default function UpsellBanner({ status, onDismiss }: UpsellBannerProps) {
  if (status === "upsell_required") {
    // Error / Blocking State
    return (
      <div className="border-b border-red-200 bg-red-50 p-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-red-800">Action Required: Usage Limit Exceeded</p>
              <p className="text-sm text-red-700">
                You currently have limited access to AI features. Please upgrade to Pro to restore full access.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/settings"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Warning State (Flagged)
  return (
    <div className="border-b border-yellow-200 bg-yellow-50 p-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-yellow-800">Usage Alert</p>
            <p className="text-sm text-yellow-700">
              You've exceeded the standard AI limits this month. No action is needed yet, but continued high usage will require a plan upgrade.
            </p>
          </div>
        </div>
        <button 
            onClick={onDismiss}
            className="text-sm font-medium text-yellow-800 underline hover:text-yellow-900"
        >
            Dismiss
        </button>
      </div>
    </div>
  );
}
