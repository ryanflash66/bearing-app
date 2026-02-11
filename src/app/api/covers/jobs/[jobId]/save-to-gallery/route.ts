import { NextRequest, NextResponse } from "next/server";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/utils/supabase/server";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import {
  buildDestinationUrl,
  extractR2KeyFromUrl,
  getFileExtensionFromKey,
  resolveCoverImageStoragePath,
  resolveCoverImageUrl,
  toContentTypeFromExtension,
} from "@/lib/covers/storage";

export const dynamic = "force-dynamic";

interface GalleryCoverImage {
  url?: string;
  storage_path?: string;
  safety_status?: string;
  seed?: number;
  [key: string]: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let imageUrl = "";
  try {
    const body = await request.json();
    imageUrl = String(body?.image_url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "image_url is required" }, { status: 400 });
  }

  const { data: coverJob, error: coverJobError } = await supabase
    .from("cover_jobs")
    .select("id, user_id, manuscript_id, prompt, wrapped_prompt, style, genre, mood, provider, model, images")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (coverJobError || !coverJob) {
    return NextResponse.json({ error: "Cover job not found" }, { status: 404 });
  }

  const jobImages = Array.isArray(coverJob.images) ? (coverJob.images as GalleryCoverImage[]) : [];
  const requestedSourceKey = extractR2KeyFromUrl(imageUrl);
  const selectedImage = jobImages.find((image) => {
    const candidateUrl = resolveCoverImageUrl(image);
    if (candidateUrl && candidateUrl === imageUrl) return true;
    const candidateStoragePath = resolveCoverImageStoragePath(image);
    return Boolean(requestedSourceKey && candidateStoragePath && candidateStoragePath === requestedSourceKey);
  });
  if (!selectedImage) {
    return NextResponse.json({ error: "Selected image does not belong to this job." }, { status: 400 });
  }

  const { data: manuscript, error: manuscriptError } = await supabase
    .from("manuscripts")
    .select("id, owner_user_id, account_id")
    .eq("id", coverJob.manuscript_id)
    .single();

  if (manuscriptError || !manuscript) {
    return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });
  }

  // Resolve profile PK (owner_user_id is users.id, not auth UUID)
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile || manuscript.owner_user_id !== profile.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sourceKey = resolveCoverImageStoragePath(selectedImage) || extractR2KeyFromUrl(imageUrl);
  if (!sourceKey) {
    return NextResponse.json({ error: "Invalid image URL. Could not derive storage path." }, { status: 400 });
  }

  const extension = getFileExtensionFromKey(sourceKey);
  const destinationKey = `gallery/${manuscript.account_id}/${manuscript.id}/${jobId}-${Date.now()}.${extension}`;

  try {
    await r2Client.send(
      new CopyObjectCommand({
        Bucket: R2_BUCKET_NAME,
        CopySource: `${R2_BUCKET_NAME}/${sourceKey}`,
        Key: destinationKey,
        ContentType: toContentTypeFromExtension(extension),
      })
    );
  } catch (error) {
    console.error("Failed to copy image to gallery path:", error);
    return NextResponse.json({ error: "Failed to persist gallery image." }, { status: 500 });
  }

  const sourceImageUrl = resolveCoverImageUrl(selectedImage) || imageUrl;
  const permanentUrl = buildDestinationUrl(sourceImageUrl, destinationKey);

  const { data: galleryAsset, error: galleryInsertError } = await supabase
    .from("gallery_assets")
    .insert({
      user_id: user.id,
      account_id: manuscript.account_id,
      manuscript_id: manuscript.id,
      job_id: coverJob.id,
      asset_type: "cover",
      url: permanentUrl,
      provider: coverJob.provider || "vertex-ai",
      model: coverJob.model || "imagen-4.0",
      prompt: coverJob.prompt,
      wrapped_prompt: coverJob.wrapped_prompt,
      metadata: {
        genre: coverJob.genre,
        mood: coverJob.mood,
        style: coverJob.style,
        generation_date: new Date().toISOString(),
        source_image_url: sourceImageUrl,
        safety_status: selectedImage.safety_status || null,
        seed: selectedImage.seed || null,
      },
    })
    .select("id, url")
    .single();

  if (galleryInsertError || !galleryAsset) {
    console.error("Failed to insert gallery asset:", galleryInsertError);
    return NextResponse.json({ error: "Failed to save gallery record." }, { status: 500 });
  }

  return NextResponse.json({
    gallery_asset_id: galleryAsset.id,
    url: galleryAsset.url,
    applied_as_cover: false,
  });
}
