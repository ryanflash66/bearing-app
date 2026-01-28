"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Manuscript, softDeleteManuscript } from "@/lib/manuscripts";
import ManuscriptList from "@/components/manuscripts/ManuscriptList";
import MagicIngest from "@/components/manuscripts/MagicIngest";

interface ManuscriptListWrapperProps {
  initialManuscripts: Manuscript[];
  accountId: string;
  userId: string;
  activeServiceRequests?: Record<string, boolean>;
}

export default function ManuscriptListWrapper({
  initialManuscripts,
  accountId,
  userId,
  activeServiceRequests = {},
}: ManuscriptListWrapperProps) {
  const router = useRouter();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>(initialManuscripts);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Sync state when server data updates (e.g. after router.refresh())
  useEffect(() => {
    setManuscripts(initialManuscripts);
  }, [initialManuscripts]);

  const handleDelete = async (manuscriptId: string) => {
    setError(null);
    const supabase = createClient();
    
    const { success, error: deleteError } = await softDeleteManuscript(
      supabase,
      manuscriptId
    );

    if (!success) {
      setError(deleteError || "Failed to delete manuscript");
      return;
    }

    // Update local state optimistically
    setManuscripts((prev) => prev.filter((m) => m.id !== manuscriptId));
    
    // Optionally refresh from server
    router.refresh();
  };

  const handleUploadComplete = () => {
    // Refresh to show the new manuscript
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Prominent Magic Ingest Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Import Manuscript</h2>
        <MagicIngest 
          accountId={accountId} 
          user={{ id: userId } as any} 
          onUploadComplete={handleUploadComplete} 
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <ManuscriptList
        manuscripts={manuscripts}
        onDelete={handleDelete}
        activeServiceRequests={activeServiceRequests}
      />
    </div>
  );
}

