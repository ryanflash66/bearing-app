"use client";

import { ServiceItem } from "@/lib/marketplace-data";
import { useState, useEffect, useRef } from "react";

interface ServiceCardProps {
  service: ServiceItem;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleRequest = () => {
    setIsRequesting(true);
    // Future integration: Open modal or navigate to request form
    timeoutRef.current = setTimeout(() => {
      setIsRequesting(false);
      console.log(`Request initiated for: ${service.title}`); // TODO: Connect to backend
    }, 1000);
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
      <div>
        <h3 className="mb-2 text-lg font-bold text-slate-900">{service.title}</h3>
        <div className="mb-4">
          <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            {service.priceRange}
          </span>
        </div>
        <p className="mb-4 text-sm text-slate-600 leading-relaxed">
          {service.description}
        </p>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Turnaround: <span className="font-medium text-slate-700">{service.turnaroundTime}</span></span>
          </div>
          <button className="text-blue-600 hover:text-blue-700 hover:underline">
            Track Order
          </button>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-100">
        <button
          onClick={handleRequest}
          disabled={isRequesting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
        >
          {isRequesting ? "Processing..." : "Request Service"}
        </button>
      </div>
    </div>
  );
}
