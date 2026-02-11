
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { unstable_cache } from "next/cache";

// Attachment metadata type for caching
interface CachedAttachment {
  manuscript_id: string;
  storage_path: string;
  mime_type: string;
  manuscripts: { owner_user_id: string } | null;
}

// Cache the DB lookup using service role client (bypasses RLS for caching)
// Ownership is verified separately against the cached data
const getAttachment = async (attachmentId: string): Promise<CachedAttachment | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing Supabase credentials for admin client");
    return null;
  }

  const admin = createAdminClient(url, key);

  const { data, error } = await admin
    .from("attachments")
    .select("manuscript_id, storage_path, mime_type, manuscripts(owner_user_id)")
    .eq("id", attachmentId)
    .is("deleted_at", null) // Don't serve soft-deleted attachments
    .single();

  if (error) return null;
  return data as CachedAttachment;
};

// AC 8.8.6: Cached attachment lookup with dynamic tagging
const getAttachmentWithCache = async (id: string): Promise<CachedAttachment | null> => {
  return unstable_cache(
    async () => getAttachment(id),
    [`attachment-${id}`],
    { tags: [`attachment-${id}`], revalidate: 3600 }
  )();
};


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id: manuscriptId, imageId } = await params;
  const supabase = await createClient();
  
  // 1. Auth Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch Metadata (Cached)
  const attachment = await getAttachmentWithCache(imageId);

  if (!attachment) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // 3. Verify Ownership / Access (AC 8.8.6: manuscript.owner_user_id === session.user.id)
  const ownerId = attachment.manuscripts?.owner_user_id;

  if (!ownerId || ownerId !== user.id) {
    // Future: Team checks here
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Verify manuscript ID matches (sanity check)
  if (attachment.manuscript_id !== manuscriptId) {
      return NextResponse.json({ error: "Invalid context" }, { status: 400 });
  }

  // 4. Stream from R2
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: attachment.storage_path,
    });

    const response = await r2Client.send(command);

    // Transform AWS SDK stream to Web ReadableStream
    const stream = response.Body?.transformToWebStream() as ReadableStream | undefined;
    
    return new NextResponse(stream, {
      headers: {
        "Content-Type": attachment.mime_type,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });

  } catch (err) {
    console.error("R2 Download Error:", err);
    return NextResponse.json({ error: "Image unavailable" }, { status: 500 });
  }
}
