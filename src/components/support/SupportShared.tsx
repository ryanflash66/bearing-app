
import React from 'react';

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

export function StatusBadge({ status }: { status: string }) {
  /**
   * Status colors mapping (aligned with Story 4.2 state machine):
   * - open: New ticket, needs initial response (green = action needed)
   * - pending_user: Waiting for user reply (cyan = awaiting customer)
   * - pending_agent: Needs support attention (yellow = warning/action needed)
   * - resolved: Closed (gray = complete)
   */
  const colors: Record<string, string> = {
    open: "bg-green-100 text-green-800",
    pending_user: "bg-cyan-100 text-cyan-800",
    pending_agent: "bg-yellow-100 text-yellow-800",
    resolved: "bg-gray-100 text-gray-800",
  };

  /**
   * Human-readable status labels
   */
  const labels: Record<string, string> = {
    open: "Open",
    pending_user: "Awaiting User",
    pending_agent: "Pending Support",
    resolved: "Resolved",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.open}`}>
      {labels[status] || status.replace(/_/g, " ")}
    </span>
  );
}
