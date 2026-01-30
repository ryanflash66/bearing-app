"use client";

import ServiceRequestModal, {
  PublishingRequestMetadata,
} from "@/components/marketplace/ServiceRequestModal";

export interface PublishingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscriptId: string;
  initialMetadata: PublishingRequestMetadata;
  onMetadataSave: (metadata: PublishingRequestMetadata) => Promise<void>;
}

export type { PublishingRequestMetadata };

export default function PublishingRequestModal({
  isOpen,
  onClose,
  manuscriptId,
  initialMetadata,
  onMetadataSave,
}: PublishingRequestModalProps) {
  return (
    <ServiceRequestModal
      isOpen={isOpen}
      onClose={onClose}
      serviceId="publishing-help"
      serviceTitle="Publishing Assistance"
      manuscriptId={manuscriptId}
      initialMetadata={initialMetadata}
      onMetadataSave={onMetadataSave}
    />
  );
}
