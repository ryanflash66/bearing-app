import Link from "next/link";
import { TicketWithDerived, getTicketDetailLink } from "@/lib/tickets";
import { formatDate, StatusBadge } from "@/components/support/SupportShared";

type TicketListItemProps = {
  ticket: TicketWithDerived;
  isAgent: boolean;
  currentUserId: string;
};

export default function TicketListItem({ ticket, isAgent, currentUserId }: TicketListItemProps) {
  const detailLink = getTicketDetailLink(ticket, isAgent);
  const isStaleForAgent = ticket.isStale && isAgent;

  return (
    <li className={isStaleForAgent ? "bg-red-50" : ""}>
      <Link href={detailLink} className="block hover:bg-slate-50">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Stale Indicator */}
              {isStaleForAgent && (
                <span
                  className="flex h-2 w-2 rounded-full bg-red-600"
                  title="Stale (>48h)"
                />
              )}
              
              <p
                className={`truncate text-sm font-medium ${
                  isStaleForAgent ? "text-red-700 font-bold" : "text-indigo-600"
                }`}
              >
                {ticket.subject}
              </p>
              
              {isAgent && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                  {ticket.user_id === currentUserId ? "Me" : "User"}
                </span>
              )}
              
              {/* Priority Badge */}
              {ticket.priority === "high" && (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                  High
                </span>
              )}
            </div>
            
            <div className="ml-2 flex flex-shrink-0">
              <StatusBadge status={ticket.status} />
            </div>
          </div>
          
          <div className="mt-2 sm:flex sm:justify-between">
            <div className="sm:flex">
              <p className="flex items-center text-sm text-slate-500">
                 Ticket #{ticket.id.slice(0, 8)}
              </p>
            </div>
            <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
              <p>
                Last updated on <time dateTime={ticket.updated_at}>{formatDate(ticket.updated_at)}</time>
              </p>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
