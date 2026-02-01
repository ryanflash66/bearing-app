"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ServiceRequest,
  formatCents,
  getServiceLabel,
  getStatusConfig,
} from "@/lib/marketplace-utils";

// Extended type to include manuscript join (AC 8.13.1, 8.13.5)
export interface OrderWithManuscript extends ServiceRequest {
  manuscripts?: { id: string; title: string } | null;
}

interface OrderItemProps {
  order: OrderWithManuscript;
}

export default function OrderItem({ order }: OrderItemProps) {
  const statusConfig = getStatusConfig(order.status);

  return (
    <li>
      <Link
        href={`/dashboard/orders/${order.id}`}
        className="block hover:bg-slate-50 transition-colors"
      >
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="truncate text-sm font-medium text-indigo-600">
                {getServiceLabel(order.service_type)}
              </p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.className}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <div className="ml-2 flex flex-shrink-0">
              <p className="text-sm font-medium text-slate-900">
                {formatCents(order.amount_cents)}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-500">
                {format(new Date(order.created_at), "MMM d, yyyy")}
              </p>
              {/* AC 8.13.5: Manuscript link if linked */}
              {order.manuscripts && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `/dashboard/manuscripts/${order.manuscripts!.id}`;
                  }}
                  className="inline-flex items-center text-sm text-slate-600 hover:text-indigo-600 cursor-pointer transition-colors"
                >
                  <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="truncate max-w-[200px]">{order.manuscripts.title}</span>
                </span>
              )}
            </div>
            <svg className="h-5 w-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </Link>
    </li>
  );
}
