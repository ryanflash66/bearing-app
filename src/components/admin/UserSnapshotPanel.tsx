import { createClient } from "@/utils/supabase/server";
import { getUserSnapshot, UserSnapshot } from "@/lib/user-snapshot";

interface UserSnapshotPanelProps {
  userId: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    good_standing: "bg-green-100 text-green-800",
    overage_warning: "bg-yellow-100 text-yellow-800",
    overage_locked: "bg-red-100 text-red-800",
    pending_upsell: "bg-orange-100 text-orange-800",
  };
  
  const colorClass = colors[status] || "bg-slate-100 text-slate-800";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

/**
 * Server Component: User Snapshot Panel for Support Agent Dashboard
 * AC 4.4.1: Displays key user context (Tier, Usage Status, Last Error)
 * AC 4.4.3: PII is masked (email masked in getUserSnapshot)
 */
export default async function UserSnapshotPanel({ userId }: UserSnapshotPanelProps) {
  const supabase = await createClient();
  const { snapshot, error } = await getUserSnapshot(supabase, userId);

  if (error || !snapshot) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Unable to load user context.</p>
      </div>
    );
  }

  return (
    <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Author Snapshot</h3>
      </div>
      <dl className="divide-y divide-slate-100">
        {/* Display Name */}
        <div className="px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">Name</dt>
          <dd className="mt-1 text-sm text-slate-900">
            {snapshot.displayName || "—"}
          </dd>
        </div>
        
        {/* Masked Email */}
        <div className="px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">Email</dt>
          <dd className="mt-1 text-sm text-slate-700 font-mono">
            {snapshot.email}
          </dd>
        </div>

        {/* Subscription Tier */}
        <div className="px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">Plan</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">
            {snapshot.subscriptionTier}
          </dd>
        </div>

        {/* Usage Status */}
        <div className="px-4 py-3">
          <dt className="text-xs font-medium text-slate-500">Usage Status</dt>
          <dd className="mt-1">
            <StatusBadge status={snapshot.usageStatus} />
          </dd>
        </div>

        {/* Last Error (if any) */}
        {snapshot.lastError && (
          <div className="px-4 py-3 bg-red-50">
            <dt className="text-xs font-medium text-red-600">Last Error</dt>
            <dd className="mt-1 text-xs text-red-800 line-clamp-3">
              {snapshot.lastError}
            </dd>
            {snapshot.lastErrorAt && (
              <dd className="mt-1 text-xs text-red-500">
                {new Date(snapshot.lastErrorAt).toLocaleDateString()}
              </dd>
            )}
          </div>
        )}
      </dl>
    </aside>
  );
}
