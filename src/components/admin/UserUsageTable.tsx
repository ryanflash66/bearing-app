"use client";

import { useState, useTransition } from "react";
import { UserUsageStat } from "@/lib/usage-admin";
import { toggleAiStatus, saveNote, toggleMemberStatusAction } from "@/app/dashboard/admin/actions";

interface UserUsageTableProps {
  stats: UserUsageStat[];
  accountId: string;
}

export default function UserUsageTable({ stats, accountId }: UserUsageTableProps) {
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const [editingNoteUserId, setEditingNoteUserId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");

  const filteredStats = stats.filter(
    (s) =>
      s.email.toLowerCase().includes(filter.toLowerCase()) ||
      (s.display_name && s.display_name.toLowerCase().includes(filter.toLowerCase()))
  );

  const handleToggleAi = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    if (confirm(`Are you sure you want to ${newStatus === 'disabled' ? 'disable' : 'enable'} AI for this user?`)) {
      startTransition(async () => {
        await toggleAiStatus({ accountId, targetUserId: userId, newStatus });
      });
    }
  };
  
  const handleToggleMemberStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    const action = newStatus === 'suspended' ? 'suspend' : 'activate';
    if (confirm(`Are you sure you want to ${action} this user? They will lose access to the account.`)) {
      startTransition(async () => {
        await toggleMemberStatusAction({ accountId, targetUserId: userId, newStatus });
      });
    }
  };

  const startEditingNote = (userId: string, currentNote: string | null) => {
    setEditingNoteUserId(userId);
    setNoteContent(currentNote || "");
  };

  const handleSaveNote = async () => {
    if (!editingNoteUserId) return;
    startTransition(async () => {
      await saveNote({ accountId, targetUserId: editingNoteUserId, note: noteContent });
      setEditingNoteUserId(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <input
          type="text"
          placeholder="Filter users..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3 text-right">Tokens (Cycle)</th>
              <th className="px-6 py-3 text-right">Checks (Cycle)</th>
              <th className="px-6 py-3">AI Status</th>
              <th className="px-6 py-3">Note</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStats.map((stat) => (
                <tr key={stat.user_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-slate-900">
                        {stat.display_name || stat.email.split("@")[0]}
                      </div>
                      <div className="text-slate-500">{stat.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {stat.account_role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-600">
                    {stat.total_tokens.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-600">
                    {stat.total_checks}
                  </td>
                  <td className="px-6 py-4">
                    <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      stat.ai_status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {stat.ai_status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {editingNoteUserId === stat.user_id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={handleSaveNote} 
                          disabled={isPending}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setEditingNoteUserId(null)} 
                          className="text-xs font-medium text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => startEditingNote(stat.user_id, stat.internal_note)}
                      className="cursor-pointer text-xs text-slate-500 hover:text-slate-800"
                    >
                      {stat.internal_note ? (
                        <span className="line-clamp-2">{stat.internal_note}</span>
                      ) : (
                        <span className="italic text-slate-400">Add note...</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                    <button
                      disabled={isPending}
                      onClick={() => handleToggleAi(stat.user_id, stat.ai_status)}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 mr-3"
                    >
                      {stat.ai_status === "active" ? "Disable AI" : "Enable AI"}
                    </button>
                    
                    <button
                      disabled={isPending}
                      onClick={() => handleToggleMemberStatus(stat.user_id, stat.member_status)}
                      className={`text-xs disabled:opacity-50 ${
                        stat.member_status === "active" 
                          ? "text-red-600 hover:text-red-800" 
                          : "text-emerald-600 hover:text-emerald-800"
                      }`}
                    >
                      {stat.member_status === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
