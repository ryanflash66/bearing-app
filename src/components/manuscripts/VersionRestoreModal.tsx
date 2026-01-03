"use client";

interface VersionRestoreModalProps {
  isOpen: boolean;
  versionNum: number | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function VersionRestoreModal({
  isOpen,
  versionNum,
  onConfirm,
  onCancel,
  isLoading,
}: VersionRestoreModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-indigo-50 px-6 py-6 border-b border-indigo-100">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Restore Version {versionNum}?
              </h3>
              <p className="text-sm text-indigo-600 font-medium">
                Time Machine Action
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <p className="text-slate-600 leading-relaxed">
            You are about to restore <span className="font-bold text-slate-900">Version {versionNum}</span>. 
            Don't worry, your current work will be automatically saved as a new version before we go back in time.
          </p>
          
          <div className="mt-6 flex items-start gap-3 rounded-lg bg-amber-50 p-4 border border-amber-200">
            <svg className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-800 leading-tight">
              A safety snapshot of your current writing will be created as the latest version in the history.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 bg-slate-50 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="group relative flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Restoring...
              </span>
            ) : (
              "Confirm Restoration"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
