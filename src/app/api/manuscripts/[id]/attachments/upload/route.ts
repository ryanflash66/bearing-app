
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from "file-type";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: manuscriptId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Check Manuscript Ownership
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

  // 2. Check Upload Limits (50/day)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: limitError } = await supabase
    .from("attachments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneDayAgo);
  
  if (limitError) {
      console.error("Limit check error:", limitError);
      return NextResponse.json({ error: "System error" }, { status: 500 });
  }

  if ((count || 0) >= 50) {
      return NextResponse.json({ error: "Daily upload limit reached (50/day)." }, { status: 429 });
  }

  // 3. Parse File
  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  
  const file = formData.get("file") as File | null;
  const widthStr = formData.get("width") as string | null;
  const heightStr = formData.get("height") as string | null;
  const altText = formData.get("alt_text") as string | null;

  if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 5MB Limit
  if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (>5MB)" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 4. Validate File Type
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !type.mime.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Must be an image." }, { status: 400 });
  }

  // 5. Upload to R2
  const fileExt = type.ext;
  const fileName = `${uuidv4()}.${fileExt}`;
  const storagePath = `manuscripts/${manuscriptId}/${fileName}`;

  try {
      await r2Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: storagePath,
          Body: buffer,
          ContentType: type.mime,
      }));
  } catch (err) {
      console.error("R2 Upload Error:", err);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  // 6. Insert into DB
  try {
      const { data: attachment, error: dbError } = await supabase
        .from("attachments")
        .insert({
            manuscript_id: manuscriptId,
            user_id: user.id,
            source: "user_upload",
            storage_path: storagePath,
            alt_text: altText || null,
            file_size: file.size,
            mime_type: type.mime,
            original_filename: file.name,
            metadata: {
                width: widthStr ? parseInt(widthStr) : null,
                height: heightStr ? parseInt(heightStr) : null,
            },
        })
        .select()
        .single();

      if (dbError) {
          throw dbError;
      }

      return NextResponse.json(attachment);

  } catch (err) {
      console.error("DB Insert Error, rolling back R2:", err);
      // Rollback R2
      try {
          await r2Client.send(new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: storagePath,
          }));
      } catch (delErr) {
          console.error(`[OrphanedFile] Failed to delete orphaned R2 file: ${storagePath}`, delErr);
      }
      return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
