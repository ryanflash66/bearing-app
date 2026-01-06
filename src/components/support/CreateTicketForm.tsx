
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTicketForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create ticket");
      }
      
      router.refresh();
      router.push("/dashboard/support");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-sm rounded-lg border border-slate-200">
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-slate-700">Subject</label>
        <input
          type="text"
          id="subject"
          name="subject"
          required
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-slate-900 caret-indigo-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm"
          placeholder="Brief description of the issue"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-slate-700">Message</label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm text-slate-900 caret-indigo-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm"
          placeholder="Describe your issue in detail..."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Ticket"}
        </button>
      </div>
    </form>
  );
}
