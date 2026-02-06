"use client";

import { useState } from "react";
import PublishingSettingsForm from "./PublishingSettingsForm";

interface PublishingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMetadata: Record<string, unknown>;
  onSave: (metadata: Record<string, unknown>) => void;
}

export default function PublishingSettingsModal({
  isOpen,
  onClose,
  initialMetadata,
  onSave,
}: PublishingSettingsModalProps) {
  const [metadata, setMetadata] = useState<Record<string, unknown>>(
    initialMetadata
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Publishing Details
          </h2>
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          <PublishingSettingsForm
            metadata={metadata}
            onChange={(next) => setMetadata(next)}
          />
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(metadata)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
