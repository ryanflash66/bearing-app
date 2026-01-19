"use client";

import { useState, useEffect } from "react";
import PublishingSettingsForm, { PublishingMetadata } from "./PublishingSettingsForm";

interface PublishingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMetadata: PublishingMetadata;
  onSave: (metadata: PublishingMetadata) => void;
}

export default function PublishingSettingsModal({
  isOpen,
  onClose,
  initialMetadata,
  onSave,
}: PublishingSettingsModalProps) {
  const [metadata, setMetadata] = useState<PublishingMetadata>(initialMetadata || {});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMetadata(initialMetadata || {});
      setIsDirty(false);
    }
  }, [isOpen, initialMetadata]);

  const handleSave = () => {
    onSave(metadata);
    onClose();
  };

  const handleChange = (newMetadata: PublishingMetadata) => {
    setMetadata(newMetadata);
    setIsDirty(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
      <div className="w-full h-full md:max-w-4xl md:h-[90vh] flex flex-col rounded-xl md:rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900">Publishing Details</h3>
            <p className="text-xs md:text-sm text-slate-500 hidden sm:block">
              Manage professional metadata for your book.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
          <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto">
            <PublishingSettingsForm
              metadata={metadata}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 md:px-6 py-3 md:py-4 flex justify-end gap-2 md:gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
