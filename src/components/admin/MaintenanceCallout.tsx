"use client";

import { AlertTriangle } from "lucide-react";

interface MaintenanceCalloutProps {
  enabled: boolean;
  message?: string;
}

export default function MaintenanceCallout({ enabled, message }: MaintenanceCalloutProps) {
  if (!enabled) return null;

  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
        <div>
          <h3 className="text-sm font-medium text-amber-800">Maintenance Mode Active</h3>
          <p className="mt-1 text-sm text-amber-700">
            {message || "The system is currently in maintenance mode. Some features may be restricted."}
          </p>
        </div>
      </div>
    </div>
  );
}
