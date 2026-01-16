import type { Tables } from "@/types/supabase";

// Re-export the database type for service_requests
export type ServiceRequest = Tables<"service_requests">;

// Map service_type enum to readable names
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  isbn: "ISBN Registration",
  cover_design: "Cover Design",
  editing: "Editing",
  author_website: "Author Website",
  marketing: "Marketing Package",
  social_media: "Social Media Kit",
  publishing_help: "Publishing Assistance",
  printing: "Printing Support",
};

// Estimated turnaround times for each service
export const ESTIMATED_TIMES: Record<string, string> = {
  isbn: "24-48 hours",
  cover_design: "7-10 days",
  editing: "14-21 days",
  author_website: "2-3 weeks",
  marketing: "5-7 days",
  social_media: "3-5 days",
  publishing_help: "2-4 days",
  printing: "Varies",
};

// Map status to readable names and styles
export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Paid", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getServiceLabel(serviceType: string): string {
  return SERVICE_TYPE_LABELS[serviceType] || serviceType;
}

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { label: status, className: "bg-slate-100 text-slate-800" };
}

export function getEstimatedTime(serviceType: string): string {
  return ESTIMATED_TIMES[serviceType] || "Soon";
}
