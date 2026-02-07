import { ServiceItem } from "@/lib/marketplace-data";
import ServiceCard from "./ServiceCard";

interface ServiceGridProps {
  services: ServiceItem[];
  manuscriptId?: string;
  userDisplayName?: string;
  // Map of service_type -> request_id for active requests (manuscript context only)
  activeRequestsByType?: Record<string, string>;
}

export default function ServiceGrid({ services, manuscriptId, userDisplayName, activeRequestsByType }: ServiceGridProps) {
  if (!services || services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414a1 1 0 00-.707-.293H4" /></svg>
        </div>
        <h3 className="text-sm font-medium text-slate-900">No services available</h3>
        <p className="mt-1 text-sm text-slate-500">Check back later for new offerings.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          manuscriptId={manuscriptId}
          userDisplayName={userDisplayName}
          activeRequestId={activeRequestsByType?.[service.id]}
        />
      ))}
    </div>
  );
}
