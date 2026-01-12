"use client";

import { useState, useTransition } from "react";
import { toggleMaintenanceModeAction } from "@/actions/super-admin-actions";
import { useRouter } from "next/navigation";

interface MaintenanceToggleProps {
  initialEnabled: boolean;
}

export default function MaintenanceToggle({ initialEnabled }: MaintenanceToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = async () => {
    if (!confirm(
      enabled 
        ? "Are you sure you want to DISABLE maintenance mode? Users will be able to submit jobs again."
        : "Are you sure you want to ENABLE maintenance mode? This will prevent users from submitting new jobs."
    )) {
      return;
    }

    startTransition(async () => {
      try {
        await toggleMaintenanceModeAction(!enabled);
        setEnabled(!enabled);
        // Action already revalidates, but we can keep client state in sync
      } catch (error) {
        console.error("Failed to toggle maintenance mode:", error);
        alert("Failed to update maintenance mode. See console for details.");
      }
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-slate-900">Maintenance Mode</h3>
          <p className="mt-1 text-sm text-slate-500">
            Prevent new job submissions and show a system-wide banner.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
            enabled ? "bg-amber-600" : "bg-slate-200"
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
