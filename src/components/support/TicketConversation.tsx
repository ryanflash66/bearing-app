"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatDate } from "@/components/support/SupportShared";

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

interface TicketConversationProps {
  ticketId: string;
  initialMessages: SupportMessage[];
  currentUserId: string;
}

export default function TicketConversation({
  ticketId,
  initialMessages,
  currentUserId,
}: TicketConversationProps) {
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .eq("is_internal", false)
      .order("created_at", { ascending: true }); // Chronological: oldest first

    if (!error && data) {
      setMessages(data as SupportMessage[]);
    }
  }, [supabase, ticketId]);

  // Handle reply submission
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

      // Success: clear form and refetch messages immediately
      formRef.current?.reset();
      await fetchMessages();
    } catch (err) {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Subscribe to new messages for this ticket
    const channel = supabase
      .channel(`ticket_messages_${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupportMessage;
          // Only add if not internal
          if (!newMessage.is_internal) {
            setMessages((prev) => {
              // Prevent duplicates
              if (prev.some((m) => m.id === newMessage.id)) {
                return prev;
              }
              // Append (chronological order)
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    // Refetch when tab becomes visible (safety net)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [supabase, ticketId, fetchMessages]);

  return (
    <>
      {/* Reply Form */}
      <div className="px-4 py-5 sm:p-6 bg-slate-50 border-b border-slate-200">
        <h4 className="text-sm font-medium text-slate-900 mb-2">Add a reply</h4>
        <form ref={formRef} onSubmit={handleSubmit}>
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <div className="flex gap-4">
            <textarea
              name="message"
              rows={3}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 caret-black focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Type your reply here..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if (e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
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
      </div>

      {/* Messages */}
      <div className="px-4 py-5 sm:p-6">
        <ul role="list" className="space-y-8">
          {messages.map((message) => {
            const isMe = message.sender_user_id === currentUserId;

            return (
              <li key={message.id} className={`flex ${isMe ? "justify-end" : ""}`}>
                <div
                  className={`relative max-w-xl rounded-lg px-4 py-3 shadow-sm ${
                    isMe
                      ? "bg-indigo-50 text-slate-900"
                      : "bg-white border border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <span className="text-xs font-semibold">
                      {isMe ? "You" : "Support"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{message.message}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
