"use client";

import { format, formatDistanceToNow } from "date-fns";
import { formatCents, getServiceLabel } from "@/lib/marketplace-utils";
import type { ServiceRequest } from "@/lib/marketplace-utils";

export interface FulfillmentRequest extends ServiceRequest {
  user_email?: string;
  user_display_name?: string;
}

interface FulfillmentQueueProps {
  requests: FulfillmentRequest[];
  onFulfill: (request: FulfillmentRequest) => void;
  onReject: (request: FulfillmentRequest) => void;
  isLoading?: boolean;
}

export default function FulfillmentQueue({
  requests,
  onFulfill,
  onReject,
  isLoading = false,
}: FulfillmentQueueProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
        <p className="text-sm text-slate-600">Loading pending requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No pending requests</h3>
        <p className="mt-2 text-sm text-slate-600">
          All service requests have been fulfilled. Great job!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Service
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Requested
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {request.user_display_name || "Unknown User"}
                  </p>
                  <p className="text-sm text-slate-500">{request.user_email}</p>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                  {getServiceLabel(request.service_type)}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900">
                {formatCents(request.amount_cents)}
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <div>
                  <p className="text-sm text-slate-900">
                    {format(new Date(request.created_at), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(request.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onFulfill(request)}
                    className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Fulfill
                  </button>
                  <button
                    onClick={() => onReject(request)}
                    className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
