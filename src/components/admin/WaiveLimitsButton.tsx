"use client";

import { useTransition } from "react";
import { waiveLimits } from "@/app/dashboard/admin/actions";

interface WaiveLimitsButtonProps {
  accountId: string;
  usageStatus: string;
}

export default function WaiveLimitsButton({ accountId, usageStatus }: WaiveLimitsButtonProps) {
  const [isPending, startTransition] = useTransition();

  if (usageStatus === "good_standing") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        Good Standing
      </span>
    );
  }

  const handleWaive = () => {
    if (confirm("Are you sure you want to waive limits and reset status to Good Standing?")) {
      startTransition(async () => {
        await waiveLimits({ accountId });
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        usageStatus === 'upsell_required' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
      }`}>
        {usageStatus}
      </span>
      <button
        disabled={isPending}
        onClick={handleWaive}
        className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
      >
        {isPending ? "Waiving..." : "Waive Limits"}
      </button>
    </div>
  );
}
