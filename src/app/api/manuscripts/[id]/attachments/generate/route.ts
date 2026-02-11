
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import striptags from "striptags";
import { checkUsageLimit, logUsageEvent } from "@/lib/ai-usage";

// 50k tokens per image (as per AC)
const TOKENS_PER_IMAGE = 50000;

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

  // 1. Check Ownership
  const { data: manuscript, error: manuError } = await supabase
    .from("manuscripts")
    .select("owner_user_id, account_id")
    .eq("id", manuscriptId)
    .single();

  if (manuError || !manuscript) {
     return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });
  }

  if (manuscript.owner_user_id !== user.id) {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Rate Limit (5/min)
  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { count, error: limitError } = await supabase
    .from("ai_usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("feature", "ai_generation")
    .gte("created_at", oneMinAgo);

  if (limitError) {
     console.error("Rate limit check error:", limitError);
     return NextResponse.json({ error: "System error" }, { status: 500 });
  }

  if ((count || 0) >= 5) {
      return NextResponse.json({ error: "Rate limit exceeded (5 images/min)." }, { status: 429 });
  }

  // 3. Usage Metering Check
  try {
    await checkUsageLimit(supabase, manuscript.account_id, TOKENS_PER_IMAGE);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  // 4. Parse Body
  const body = await request.json();
  const prompt = striptags(body.prompt || "").trim();

  if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // 5. Call Modal
  const modalUrl = process.env.MODAL_SDXL_URL;
  const modalKey = process.env.MODAL_API_KEY;

  if (!modalUrl || !modalKey) {
      // In dev, if missing, maybe return mock?
      // Story says "Auth: Ensure MODAL_API_KEY is set in .env".
      // I'll return service unavailable.
      console.error("Modal config missing");
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const startTime = Date.now();
  let response;
  try {
      response = await fetch(modalUrl, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${modalKey}`
          },
          body: JSON.stringify({
              prompt,
              num_inference_steps: 30
          })
      });
  } catch (err) {
       console.error("Modal Fetch Error:", err);
       return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }

  if (!response.ok) {
      const errorText = await response.text();
      console.error("Modal Error:", response.status, errorText);
      return NextResponse.json({ error: `Generation failed: ${response.statusText}` }, { status: response.status });
  }

  const data = await response.json();
  const base64Image = data.image; // Expecting { image: "base64..." }

  if (!base64Image) {
      return NextResponse.json({ error: "Invalid response from AI" }, { status: 500 });
  }

  const buffer = Buffer.from(base64Image, "base64");
  const latency = Date.now() - startTime;

  // 6. Upload R2
  const fileName = `${uuidv4()}.png`;
  const storagePath = `manuscripts/${manuscriptId}/${fileName}`;

  try {
      await r2Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: storagePath,
          Body: buffer,
          ContentType: "image/png",
      }));
  } catch (err) {
      console.error("R2 Upload Error:", err);
      return NextResponse.json({ error: "Failed to save image" }, { status: 500 });
  }

  // 7. Insert DB
  try {
      const { data: attachment, error: dbError } = await supabase
        .from("attachments")
        .insert({
            manuscript_id: manuscriptId,
            user_id: user.id,
            source: "ai_generation",
            storage_path: storagePath,
            file_size: buffer.length,
            mime_type: "image/png",
            original_filename: "generated.png",
            metadata: {
                ai_prompt: prompt,
                model_version: "sdxl-refiner",
                width: 1024,
                height: 1024
            },
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 8. Log Usage
      await logUsageEvent(
          supabase,
          manuscript.account_id,
          user.id,
          "ai_generation",
          "sdxl-refiner",
          TOKENS_PER_IMAGE,
          TOKENS_PER_IMAGE,
          latency
      );

      return NextResponse.json(attachment);

  } catch (err) {
      console.error("DB Insert Error:", err);
      // Rollback R2
      try {
        await r2Client.send(new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: storagePath,
        }));
      } catch (e) { console.error("[OrphanedFile]", e); }
      return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
