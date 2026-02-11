import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { resolveCoverImageStoragePath, resolveCoverImageUrl } from "@/lib/covers/storage";

interface CoverJobImage {
  url?: string;
  storage_path?: string;
  safety_status?: string;
  seed?: number;
  [key: string]: unknown;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: job, error: jobError } = await supabase
    .from("cover_jobs")
    .select("id, status, images, retry_after, error_message, selected_url")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Cover job not found" }, { status: 404 });
  }

  const rawImages = Array.isArray(job.images) ? (job.images as CoverJobImage[]) : [];
  const images = rawImages.map((image) => {
    const storagePath = resolveCoverImageStoragePath(image);
    const url = resolveCoverImageUrl(image);
    return {
      ...image,
      ...(storagePath ? { storage_path: storagePath } : {}),
      ...(url ? { url } : {}),
    };
  });

  const completedImages = images.filter((image) => typeof image.url === "string" && image.url.length > 0);

  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    images,
    completed_images: completedImages,
    retry_after: job.retry_after,
    error_message: job.error_message,
    selected_url: job.selected_url,
  });
}
