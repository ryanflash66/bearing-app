// import { Tables } from "@/utils/supabase/server"; // Type definition not available there.

// Actually, for now, let's define a simpler type or use 'any' if types aren't handy, 
// but better to align with `support_tickets` table shape.

// Using a partial type definition based on usage if generated types aren't immediately obvious/available in context,
// but usually they are in `@/types/supabase` or similar. I'll stick to a compatible interface.

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface SupportTicket {
  id: string;
  created_at: string;
  updated_at: string;
  subject: string;
  message: string;
  status: string;
  priority: TicketPriority;
  user_id: string;
  // add other fields as needed
}

export type TicketWithDerived = SupportTicket & {
  isStale: boolean;
  updatedAtMs: number;
};

const PRIORITY_WEIGHT: Record<TicketPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const MS_PER_HOUR = 1000 * 60 * 60;
const STALE_HOURS = 48;

/**
 * Decorates a ticket with derived fields like 'isStale'
 */
export function addDerivedFields(t: SupportTicket): TicketWithDerived {
  const updatedAtMs = new Date(t.updated_at).getTime();
  const isPendingAgent = t.status === "pending_agent";
  const hoursSinceUpdate = (Date.now() - updatedAtMs) / MS_PER_HOUR;

  return {
    ...t,
    updatedAtMs,
    isStale: isPendingAgent && hoursSinceUpdate > STALE_HOURS,
  };
}

/**
 * Sort comparator for tickets: Priority (Desc) -> Date (Desc/Newest First)
 */
export function compareTickets(a: TicketWithDerived, b: TicketWithDerived) {
  const pA = PRIORITY_WEIGHT[a.priority];
  const pB = PRIORITY_WEIGHT[b.priority];
  if (pA !== pB) return pB - pA;
  
  return b.updatedAtMs - a.updatedAtMs;
}

/**
 * Determines the correct detail link based on user role
 */
export function getTicketDetailLink(ticket: SupportTicket, isAgent: boolean) {
    return isAgent
      ? `/dashboard/admin/support/${ticket.id}`
      : `/dashboard/support/${ticket.id}`;
}
