"use client";

import Link from "next/link";
import OrderItem, { OrderWithManuscript } from "./OrderItem";

interface OrderListProps {
  orders: OrderWithManuscript[];
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
        <h3 className="text-lg font-medium text-slate-900">No service requests found</h3>
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
        {orders.map((order) => (
          <OrderItem key={order.id} order={order} />
        ))}
      </ul>
    </div>
  );
}
