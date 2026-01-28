"use client";

import { useCallback } from "react";
import ManuscriptEditor from "@/components/manuscripts/ManuscriptEditor";
import type { ServiceRequest } from "@/lib/service-requests";

interface ManuscriptEditorWrapperProps {
  manuscriptId: string;
  initialTitle: string;
  initialContent: string;
  initialUpdatedAt: string;
  initialMetadata?: Record<string, any>;
  activeServiceRequest?: ServiceRequest | null;
}

export default function ManuscriptEditorWrapper({
  manuscriptId,
  initialTitle,
  initialContent,
  initialUpdatedAt,
  initialMetadata,
  activeServiceRequest,
}: ManuscriptEditorWrapperProps) {
  // No-op for title changes in wrapper, handled by editor autosave hook
  const handleTitleChange = useCallback(async (newTitle: string) => {
    // Just refresh router if we need to sync parent state,
    // but the editor handles the actual DB write.
  }, []);

  return (
    <ManuscriptEditor
      manuscriptId={manuscriptId}
      initialTitle={initialTitle}
      initialContent={initialContent}
      initialUpdatedAt={initialUpdatedAt}
      initialMetadata={initialMetadata}
      onTitleChange={handleTitleChange}
      activeServiceRequest={activeServiceRequest}
    />
  );
}

