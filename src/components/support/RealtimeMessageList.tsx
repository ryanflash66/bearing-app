"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

interface RealtimeMessageListProps {
  ticketId: string;
  initialMessages: SupportMessage[];
  currentUserId: string;
}

export default function RealtimeMessageList({
  ticketId,
  initialMessages,
  currentUserId,
}: RealtimeMessageListProps) {
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
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
              // Append (oldest first / chronological order)
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
  );
}
