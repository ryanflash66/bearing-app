"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResolveTicketButton({ ticketId, currentStatus }: { ticketId: string, currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
      if (!confirm("Are you sure you want to mark this ticket as resolved?")) return;
      
      setLoading(true);
      try {
        const res = await fetch(`/api/support/tickets/${ticketId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "resolved" })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed");
        }
        
        router.refresh();
      } catch (err: any) {
         alert("Failed to resolve ticket: " + err.message);
      } finally {
        setLoading(false);
      }
  }

  return (
      <button
        onClick={handleResolve}
        disabled={loading}
        className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded hover:bg-green-200 border border-green-200"
      >
        {loading ? "Updating..." : "Mark as Resolved"}
      </button>
  )
}
