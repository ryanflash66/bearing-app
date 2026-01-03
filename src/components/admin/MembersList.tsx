"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AccountMemberWithDetails } from "@/lib/admin";
import RoleChangeModal from "./RoleChangeModal";

interface MembersListProps {
  members: AccountMemberWithDetails[];
  total: number;
  currentPage: number;
  totalPages: number;
  currentSearch: string;
  accountId: string;
  currentUserId: string;
  isOwner: boolean;
}

export default function MembersList({
  members,
  total,
  currentPage,
  totalPages,
  currentSearch,
  accountId,
  currentUserId,
  isOwner,
}: MembersListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [selectedMember, setSelectedMember] = useState<AccountMemberWithDetails | null>(null);
  const [modalAction, setModalAction] = useState<"role" | "remove" | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchValue.trim()) {
      params.set("search", searchValue.trim());
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`/dashboard/admin/members?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (currentSearch) {
      params.set("search", currentSearch);
    }
    params.set("page", String(page));
    startTransition(() => {
      router.push(`/dashboard/admin/members?${params.toString()}`);
    });
  };

  const openRoleModal = (member: AccountMemberWithDetails) => {
    setSelectedMember(member);
    setModalAction("role");
  };

  const closeModal = () => {
    setSelectedMember(null);
    setModalAction(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-amber-100 text-amber-800";
      case "support":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Search bar - AC 1.4.3: Search by email or name */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Searching..." : "Search"}
        </button>
        {currentSearch && (
          <button
            type="button"
            onClick={() => {
              setSearchValue("");
              startTransition(() => {
                router.push("/dashboard/admin/members");
              });
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </form>

      {/* Members table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                    {currentSearch
                      ? `No members found matching "${currentSearch}"`
                      : "No members in this account"}
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.user_id} className="hover:bg-slate-50">
                    {/* Member info - AC 1.4.3: Shows email, display name, role, created_at */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                          {(member.display_name || member.email)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {member.display_name || member.email.split("@")[0]}
                            </p>
                            {member.is_owner && (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                                Owner
                              </span>
                            )}
                            {member.user_id === currentUserId && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(
                          member.account_role
                        )}`}
                      >
                        {member.account_role}
                      </span>
                    </td>
                    {/* Joined date */}
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(member.created_at)}
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {member.user_id !== currentUserId && !member.is_owner && (
                        <button
                          onClick={() => openRoleModal(member)}
                          className="rounded px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Change Role
                        </button>
                      )}
                      {member.is_owner && (
                        <span className="text-xs text-slate-400">Cannot modify owner</span>
                      )}
                      {member.user_id === currentUserId && !member.is_owner && (
                        <span className="text-xs text-slate-400">Cannot modify self</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - AC 1.4.3: Pagination works for 100+ users */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
            <p className="text-sm text-slate-500">
              Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isPending}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isPending}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        pageNum === currentPage
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPending}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role change modal */}
      {selectedMember && modalAction === "role" && (
        <RoleChangeModal
          member={selectedMember}
          accountId={accountId}
          onClose={closeModal}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

