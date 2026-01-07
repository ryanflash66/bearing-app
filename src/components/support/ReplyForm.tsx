
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const message = formData.get("message") as string;

    if (!message.trim()) {
        setLoading(false);
        return;
    }

    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        throw new Error("Failed to send reply");
      }
      
      form.reset();
      router.refresh();
    } catch (err) {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex gap-4">
        <textarea
          name="message"
          rows={3}
          required
          className="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 caret-black focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Type your reply here..."
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
