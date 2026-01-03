"use client";

import { useState } from "react";

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onResolve: (action: "overwrite" | "reload" | "merge") => void;
  onClose: () => void;
}

export default function ConflictResolutionModal({
  isOpen,
  onResolve,
  onClose,
}: ConflictResolutionModalProps) {
  const [selectedAction, setSelectedAction] = useState<"overwrite" | "reload" | "merge" | null>(null);

  if (!isOpen) return null;

  const handleResolve = () => {
    if (selectedAction) {
      onResolve(selectedAction);
      setSelectedAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <svg
                className="h-6 w-6 text-orange-600"
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
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Conflict Detected
              </h3>
              <p className="text-sm text-slate-500">
                This manuscript was modified by another session
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-slate-600">
            Your local changes conflict with the version on the server. Choose how to resolve:
          </p>

          <div className="mt-4 space-y-3">
            {/* Option 1: Overwrite */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input
                type="radio"
                name="resolution"
                value="overwrite"
                checked={selectedAction === "overwrite"}
                onChange={() => setSelectedAction("overwrite")}
                className="mt-0.5 h-4 w-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900">Overwrite Server Version</div>
                <div className="mt-1 text-sm text-slate-500">
                  Save your local changes and replace the server version. Server changes will be lost.
                </div>
              </div>
            </label>

            {/* Option 2: Reload */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input
                type="radio"
                name="resolution"
                value="reload"
                checked={selectedAction === "reload"}
                onChange={() => setSelectedAction("reload")}
                className="mt-0.5 h-4 w-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900">Reload Server Version</div>
                <div className="mt-1 text-sm text-slate-500">
                  Discard your local changes and load the latest version from the server. Your local edits will be lost.
                </div>
              </div>
            </label>

            {/* Option 3: Merge (future enhancement) */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input
                type="radio"
                name="resolution"
                value="merge"
                checked={selectedAction === "merge"}
                onChange={() => setSelectedAction("merge")}
                className="mt-0.5 h-4 w-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  Merge Changes
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Intelligently merge your local changes with the server version.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={!selectedAction}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
}

