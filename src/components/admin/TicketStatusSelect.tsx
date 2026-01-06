
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TicketStatusSelect({ ticketId, currentStatus }: { ticketId: string, currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
      const status = e.target.value;
      setLoading(true);
      try {
        const res = await fetch(`/api/support/tickets/${ticketId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error("Failed");
        router.refresh();
      } catch (err) {
         alert("Failed to update status");
      } finally {
        setLoading(false);
      }
  }

  return (
      <select 
        value={currentStatus} 
        onChange={handleChange} 
        disabled={loading} 
        className="rounded-md border-slate-300 py-1 pl-3 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white shadow-sm"
      >
        <option value="open">Open</option>
        <option value="pending_user">Awaiting User</option>
        <option value="pending_agent">Pending Support</option>
        <option value="resolved">Resolved</option>
      </select>
  )
}
