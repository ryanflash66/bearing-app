"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AccountMemberWithDetails } from "@/lib/admin";
import { changeRole } from "@/app/dashboard/admin/actions";

interface RoleChangeModalProps {
  member: AccountMemberWithDetails;
  accountId: string;
  onClose: () => void;
  currentUserId: string;
}

const ROLES = [
  { value: "author", label: "Author", description: "Can create and edit manuscripts" },
  { value: "admin", label: "Admin", description: "Full access to manage account" },
  { value: "support", label: "Support", description: "Can view and manage support tickets" },
] as const;

export default function RoleChangeModal({
  member,
  accountId,
  onClose,
  currentUserId,
}: RoleChangeModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState(member.account_role);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedRole === member.account_role) {
      onClose();
      return;
    }

    startTransition(async () => {
      const result = await changeRole({
        accountId,
        targetUserId: member.user_id,
        newRole: selectedRole,
        actorUserId: currentUserId,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform rounded-2xl bg-white p-6 shadow-xl transition-all">
          {/* Header */}
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-900">Change Member Role</h3>
            <p className="mt-1 text-sm text-slate-500">
              Update role for {member.display_name || member.email}
            </p>
          </div>

          {/* Error message - AC 1.4.5: Clear error on blocked action */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Role selection */}
            <div className="space-y-3">
              {ROLES.map((role) => (
                <label
                  key={role.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                    selectedRole === role.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={selectedRole === role.value}
                    onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
                    className="mt-1 h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-slate-900">{role.label}</p>
                    <p className="text-sm text-slate-500">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Warning for admin demotion */}
            {member.account_role === "admin" && selectedRole !== "admin" && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-700">
                  <strong>Warning:</strong> Demoting this admin will remove their administrative
                  privileges. Make sure there is at least one other admin in the account.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || selectedRole === member.account_role}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

