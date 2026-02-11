"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { FeatureBreakdown } from "@/lib/ai-usage";
import { MONTHLY_TOKEN_CAP } from "@/lib/ai-usage";

interface AiTokensDetailsSheetProps {
  breakdown: FeatureBreakdown[];
  tokensUsed: number;
  trigger: React.ReactNode;
}

/**
 * Sheet component that displays detailed per-feature AI token usage breakdown.
 * Shows exact token counts with locale-aware formatting and action counts per feature.
 */
export function AiTokensDetailsSheet({
  breakdown,
  tokensUsed,
  trigger,
}: AiTokensDetailsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>AI Token Usage Details</SheetTitle>
          <SheetDescription>
            Breakdown of your AI usage for the current billing cycle
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Tokens Used</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {tokensUsed.toLocaleString("en-US")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-500">Monthly Cap</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {MONTHLY_TOKEN_CAP.toLocaleString("en-US")}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-violet-600 transition-all"
                  style={{
                    width: `${Math.min((tokensUsed / MONTHLY_TOKEN_CAP) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {Math.min((tokensUsed / MONTHLY_TOKEN_CAP) * 100, 100).toFixed(1)}% of monthly cap
              </p>
            </div>
          </div>

          {/* Feature breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Usage by Feature
            </h3>
            {breakdown.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
                <p className="text-sm text-slate-500">No AI usage yet this cycle.</p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="feature-breakdown">
                {breakdown.map((item) => (
                  <div
                    key={item.feature}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.count} {item.count === 1 ? "action" : "actions"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-slate-900">
                          {item.tokens.toLocaleString("en-US")}
                        </p>
                        <p className="text-xs text-slate-500">tokens</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upgrade CTA */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              Need more tokens?
            </p>
            <p className="mt-1 text-sm text-blue-700">
              Additional tokens are available via plan upgrade.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              View upgrade options
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
