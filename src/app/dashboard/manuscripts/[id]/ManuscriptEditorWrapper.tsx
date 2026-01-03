"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { updateManuscript } from "@/lib/manuscripts";
import ManuscriptEditor from "@/components/manuscripts/ManuscriptEditor";

interface ManuscriptEditorWrapperProps {
  manuscriptId: string;
  initialTitle: string;
  initialContent: string;
  initialUpdatedAt: string;
}

export default function ManuscriptEditorWrapper({
  manuscriptId,
  initialTitle,
  initialContent,
  initialUpdatedAt,
}: ManuscriptEditorWrapperProps) {
  const router = useRouter();

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
      onTitleChange={handleTitleChange}
    />
  );
}

