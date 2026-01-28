"use client";

import { useEffect, useMemo, useState } from "react";

interface BetaInvite {
  id: string;
  token: string;
  permissions: "read" | "comment";
  expires_at: string;
}

interface BetaShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscriptId: string;
}

const DEFAULT_DAYS = 30;

function getDefaultExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + DEFAULT_DAYS);
  return date.toISOString().slice(0, 10);
}

export default function BetaShareModal({
  isOpen,
  onClose,
  manuscriptId,
}: BetaShareModalProps) {
  const [invites, setInvites] = useState<BetaInvite[]>([]);
  const [permissions, setPermissions] = useState<"read" | "comment">("read");
  const [expiresAt, setExpiresAt] = useState<string>(getDefaultExpiryDate());
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const loadInvites = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manuscripts/${manuscriptId}/beta-invites`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to load invites" }));
        throw new Error(data.error || "Failed to load invites");
      }
      const data = await res.json();
      setInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invites");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInvites();
    } else {
      setError(null);
      setCopiedId(null);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/manuscripts/${manuscriptId}/beta-invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions,
          expiresAt,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to create invite" }));
        throw new Error(data.error || "Failed to create invite");
      }
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/manuscripts/${manuscriptId}/beta-invites/${inviteId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to revoke invite" }));
        throw new Error(data.error || "Failed to revoke invite");
      }
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    }
  };

  const handleCopy = async (invite: BetaInvite) => {
    const link = `${baseUrl}/beta/${invite.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Failed to copy link");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
      <div className="w-full h-full md:h-auto md:max-w-3xl rounded-xl md:rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900">Share with Beta Readers</h3>
            <p className="text-xs md:text-sm text-slate-500 hidden sm:block">
              Generate invite links with read-only or comment permissions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid gap-4 md:gap-6 px-4 md:px-6 py-4 md:py-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-700">Create Invite</h4>
            <div className="mt-4 space-y-4">
              <label className="block text-sm text-slate-600">
                Permission
                <select
                  value={permissions}
                  onChange={(e) => setPermissions(e.target.value as "read" | "comment")}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="read">Read Only</option>
                  <option value="comment">Read &amp; Comment</option>
                </select>
              </label>
              <label className="block text-sm text-slate-600">
                Expiration Date
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-xs text-slate-400">
                  Defaults to {DEFAULT_DAYS} days from now.
                </span>
              </label>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60 min-h-[44px]"
              >
                {isCreating ? "Creating..." : "Generate Invite Link"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Active Links</h4>
              <button
                onClick={loadInvites}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Refresh
              </button>
            </div>
            {isLoading ? (
              <div className="mt-4 text-sm text-slate-500">Loading invites...</div>
            ) : invites.length === 0 ? (
              <div className="mt-4 text-sm text-slate-500">No active links yet.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {invite.permissions === "comment" ? "Read & Comment" : "Read Only"}
                        </div>
                        <div className="text-xs text-slate-500">
                          Expires {new Date(invite.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(invite)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
                        >
                          {copiedId === invite.id ? "Copied!" : "Copy"}
                        </button>
                        <button
                          onClick={() => handleRevoke(invite.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 min-h-[44px] min-w-[44px]"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-400 break-all">
                      {baseUrl ? `${baseUrl}/beta/${invite.token}` : invite.token}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="border-t border-slate-200 bg-red-50 px-6 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
