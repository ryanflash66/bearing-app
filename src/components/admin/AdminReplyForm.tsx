"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface AdminReplyFormProps {
  ticketId: string;
}

/**
 * Admin Reply Form - Client component for support agents to reply to tickets.
 * Separated from the deleted ReplyForm to provide admin-specific functionality.
 */
export default function AdminReplyForm({ ticketId }: AdminReplyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
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

      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="flex gap-3">
        <textarea
          name="message"
          rows={2}
          required
          aria-label="Reply message"
          className="block w-full rounded-md border-gray-300 bg-white shadow-sm text-gray-900 caret-black appearance-none focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm resize-none relative z-0"
          placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </form>
  );
}
