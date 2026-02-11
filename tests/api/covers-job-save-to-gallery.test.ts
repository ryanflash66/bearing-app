/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/covers/jobs/[jobId]/save-to-gallery/route";
import { createClient } from "@/utils/supabase/server";
import { r2Client } from "@/lib/r2";

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/r2", () => ({
  r2Client: {
    send: jest.fn(),
  },
  R2_BUCKET_NAME: "bearing-uploads",
}));

describe("POST /api/covers/jobs/[jobId]/save-to-gallery", () => {
  const params = Promise.resolve({ jobId: "job-2" });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves selected image to gallery without applying as cover", async () => {
    const mockInsertSingle = jest.fn().mockResolvedValue({
      data: { id: "gallery-22", url: "https://cdn.example.com/gallery/acc-1/manu-1/job-2-1.webp" },
      error: null,
    });

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === "cover_jobs") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: "job-2",
                      user_id: "user-1",
                      manuscript_id: "manu-1",
                      prompt: "forest at dusk",
                      wrapped_prompt: "Professional book cover illustration...",
                      style: "Cinematic",
                      genre: "Fantasy",
                      mood: "Epic",
                      provider: "vertex-ai",
                      model: "imagen-4.0",
                      images: [{ storage_path: "tmp/covers/manu-1/job-2/1.webp", safety_status: "ok", seed: 42 }],
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "manuscripts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "manu-1", owner_user_id: "user-1", account_id: "acc-1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "gallery_assets") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: mockInsertSingle,
              }),
            }),
          };
        }
        return {};
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (r2Client.send as jest.Mock).mockResolvedValue({});

    const request = new NextRequest("http://localhost:3000/api/covers/jobs/job-2/save-to-gallery", {
      method: "POST",
      body: JSON.stringify({
        image_url: "https://cdn.example.com/tmp/covers/manu-1/job-2/1.webp",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request, { params });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(r2Client.send).toHaveBeenCalled();
    expect(payload.gallery_asset_id).toBe("gallery-22");
    expect(payload.applied_as_cover).toBe(false);
  });
});
