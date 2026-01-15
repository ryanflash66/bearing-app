import Link from "next/link";
import { format } from "date-fns";
import {
  ServiceRequest,
  formatCents,
  getServiceLabel,
  getStatusConfig,
} from "@/lib/marketplace-utils";

interface OrderListProps {
  orders: ServiceRequest[];
}

export default function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-8 w-8 text-slate-400" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No orders found</h3>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
          You haven&apos;t purchased any services yet.{" "}
          <Link href="/dashboard/marketplace" className="text-indigo-600 hover:text-indigo-500 font-medium">
            Browse the marketplace
          </Link>{" "}
          to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul role="list" className="divide-y divide-slate-200">
        {orders.map((order) => {
          const statusConfig = getStatusConfig(order.status);
          return (
            <li key={order.id}>
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
                  <div className="mt-2 flex justify-between">
                    <p className="text-sm text-slate-500">
                      {format(new Date(order.created_at), "MMM d, yyyy")}
                    </p>
                    <svg className="h-5 w-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
