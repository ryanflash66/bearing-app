"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatDate } from "@/components/support/SupportShared";

// Module-level singleton client (per code review)
const supabase = createClient();

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
  ticketOwnerId: string; // The user who created the ticket
}

// Extracted keyboard handler (per code review)
function handleMessageKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key === "Enter" && !e.shiftKey) {
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    e.currentTarget.form?.requestSubmit();
  }
}

export default function TicketConversation({
  ticketId,
  initialMessages,
  currentUserId,
  ticketOwnerId,
}: TicketConversationProps) {
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync messages if ticketId changes (per code review)
  useEffect(() => {
    setMessages(initialMessages);
  }, [ticketId, initialMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchMessages() {
    setFetchError(null);
    const { data, error: supabaseError } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .eq("is_internal", false)
      .order("created_at", { ascending: true }); // Chronological: oldest first

    if (supabaseError) {
      console.error("Failed to fetch support messages", { ticketId, error: supabaseError });
      setFetchError("Failed to load messages.");
      return;
    }

    if (data) {
      setMessages(data as SupportMessage[]);
    }
  }

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
          if (!newMessage.is_internal) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [ticketId]);

  return (
    <>
      {/* Messages FIRST (scroll area) */}
      <div className="px-4 py-5 sm:p-6 max-h-96 overflow-y-auto">
        {fetchError && (
          <p className="text-sm text-red-600 mb-4 text-center">{fetchError}</p>
        )}
        <ul role="list" className="space-y-4">
          {messages.map((message) => {
            const isMe = message.sender_user_id === currentUserId;
            const isTicketOwner = message.sender_user_id === ticketOwnerId;
            
            // Determine sender label
            let senderLabel = "Support";
            if (isMe) {
              senderLabel = "You";
            } else if (isTicketOwner) {
              senderLabel = "User";
            }

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
                      {senderLabel}
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
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Form at BOTTOM */}
      <div className="px-4 py-4 sm:px-6 bg-slate-50 border-t border-slate-200">
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
              onKeyDown={handleMessageKeyDown}
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
      </div>
    </>
  );
}
