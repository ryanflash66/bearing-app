
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id: manuscriptId, attachmentId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Verify Manuscript Ownership (defense in depth beyond RLS)
  const { data: manuscript, error: manuError } = await supabase
    .from("manuscripts")
    .select("owner_user_id")
    .eq("id", manuscriptId)
    .single();

  if (manuError || !manuscript) {
    return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });
  }

  if (manuscript.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Mark as deleted in DB (Soft Delete)
  const { data: attachment, error: dbError } = await supabase
    .from("attachments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", attachmentId)
    .eq("manuscript_id", manuscriptId)
    .select()
    .single();

  if (dbError) {
      if (dbError.code === 'PGRST116') {
           return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
      }
      return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // 2. Delete from R2
  try {
      await r2Client.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: attachment.storage_path,
      }));
  } catch (err) {
      console.error(`[OrphanedFile] Failed to delete R2 file: ${attachment.storage_path}`, err);
  }

  return NextResponse.json({ success: true });
}
