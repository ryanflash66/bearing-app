"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GlobalUser } from "@/lib/super-admin-users";
import { updateUserRoleAction } from "@/app/dashboard/admin/super/actions";

interface GlobalUsersTableProps {
  users: GlobalUser[];
  total: number;
  currentPage: number;
  totalPages: number;
  totalPages: number;
  currentSearch: string;
  currentUserId?: string;
}

const ROLES = [
  { value: "user", label: "User" },
  { value: "support_agent", label: "Support Agent" },
  { value: "super_admin", label: "Super Admin" },
] as const;

export default function GlobalUsersTable({
  users,
  total,
  currentPage,
  totalPages,
  totalPages,
  currentSearch,
  currentUserId,
}: GlobalUsersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);

  const handleRoleChange = (userId: string, newRole: "user" | "support_agent" | "super_admin") => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    startTransition(async () => {
      const result = await updateUserRoleAction(userId, newRole);
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        router.refresh();
      }
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/dashboard/admin/super/users?search=${encodeURIComponent(search)}`);
  };

  const handlePageChange = (page: number) => {
    router.push(
      `/dashboard/admin/super/users?page=${page}&search=${encodeURIComponent(currentSearch)}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {user.display_name || "No Name"}
                      </div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      user.role === "super_admin"
                        ? "bg-purple-100 text-purple-800"
                        : user.role === "support_agent"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                  {user.id === currentUserId ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                        Cannot modify self
                      </span>
                  ) : (
                    <select
                        value={user.role}
                        onChange={(e) =>
                        handleRoleChange(user.id, e.target.value as any)
                        }
                        disabled={isPending}
                        className="rounded-md border-slate-300 py-1 pl-2 pr-8 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                            {role.label}
                        </option>
                        ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-700">
          Page {currentPage} of {totalPages} ({total} users)
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
