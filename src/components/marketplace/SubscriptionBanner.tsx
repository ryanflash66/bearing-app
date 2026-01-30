"use client";

import Link from "next/link";

export type SubscriptionTier = "free" | "pro" | "enterprise";

interface SubscriptionBannerProps {
  tier: SubscriptionTier;
  className?: string;
}

// Pro benefits to display for free users
const PRO_BENEFITS = [
  { icon: "📚", text: "Free ISBNs for all your books" },
  { icon: "🎨", text: "Priority cover design queue" },
  { icon: "📞", text: "Dedicated Ops support" },
  { icon: "💰", text: "10% discount on all services" },
];

export default function SubscriptionBanner({
  tier,
  className = "",
}: SubscriptionBannerProps) {
  const isFree = tier === "free";
  const isPro = tier === "pro" || tier === "enterprise";

  if (isPro) {
    // Pro/Enterprise: Show status acknowledgement
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 md:p-6 ${className}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
              <svg
                className="h-5 w-5"
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
            <div>
              <h3 className="text-lg font-semibold text-indigo-900">
                {tier === "enterprise" ? "Enterprise" : "Pro"} Member Access Active
              </h3>
              <p className="text-sm text-indigo-700">
                Enjoy priority support and exclusive benefits on all services.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="hidden md:inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            Manage Subscription
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  // Free tier: Show upgrade CTA with benefits
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-4 md:p-6 ${className}`}
    >
      {/* Decorative background element */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-100/50 blur-2xl" />
      <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-orange-100/50 blur-2xl" />

      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Title and benefits */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                <svg
                  className="h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Upgrade to Pro
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">
              Unlock Premium Publishing Benefits
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
              {PRO_BENEFITS.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span>{benefit.icon}</span>
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: CTA */}
          <div className="flex-shrink-0">
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-amber-700 transition-colors w-full md:w-auto"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              Subscribe / Upgrade
            </Link>
            <p className="mt-2 text-center text-xs text-slate-500 hidden md:block">
              Starting at $19.99/month
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
