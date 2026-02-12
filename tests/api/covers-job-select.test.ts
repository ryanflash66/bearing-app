/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/covers/jobs/[jobId]/select/route";
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

describe("POST /api/covers/jobs/[jobId]/select", () => {
  const params = Promise.resolve({ jobId: "job-1" });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeRequest = (body: Record<string, unknown>) =>
    new NextRequest("http://localhost:3000/api/covers/jobs/job-1/select", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

  it("returns 400 when confirm is false", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "users") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: "user-1" }, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    });

    const response = await POST(
      makeRequest({ image_url: "https://cdn.example.com/tmp/covers/manu/job-1/0.webp", confirm: false }),
      { params }
    );

    expect(response.status).toBe(400);
  });

  it("copies selected image and persists manuscript + gallery state", async () => {
    const mockUpdateManuscript = jest.fn();
    const mockUpdateManuscriptEq = jest.fn().mockResolvedValue({ error: null });
    const mockSelectCoverJobSingle = jest.fn().mockResolvedValue({
      data: {
        id: "job-1",
        user_id: "user-1",
        manuscript_id: "manu-1",
        prompt: "A cinematic fantasy cover",
        wrapped_prompt: "Professional book cover illustration...",
        style: "Cinematic",
        genre: "Fantasy",
        mood: "Epic",
        provider: "vertex-ai",
        model: "imagen-4.0",
        images: [{ storage_path: "tmp/covers/manu-1/job-1/0.webp", safety_status: "ok", seed: 11 }],
      },
      error: null,
    });

    const mockSelectManuscriptSingle = jest.fn().mockResolvedValue({
      data: {
        id: "manu-1",
        owner_user_id: "user-1",
        account_id: "acc-1",
        cover_url: "https://cdn.example.com/covers/acc-1/manu-1/current.webp",
        metadata: {},
      },
      error: null,
    });

    const mockInsertGallerySingle = jest.fn().mockResolvedValue({
      data: { id: "gallery-1" },
      error: null,
    });

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "users") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: "user-1" }, error: null }),
              }),
            }),
          };
        }
        if (table === "cover_jobs") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: mockSelectCoverJobSingle,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "manuscripts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: mockSelectManuscriptSingle,
              }),
            }),
            update: mockUpdateManuscript.mockReturnValue({
              eq: mockUpdateManuscriptEq,
            }),
          };
        }
        if (table === "gallery_assets") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: mockInsertGallerySingle,
              }),
            }),
          };
        }
        return {};
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (r2Client.send as jest.Mock).mockResolvedValue({});

    const response = await POST(
      makeRequest({ image_url: "https://cdn.example.com/tmp/covers/manu-1/job-1/0.webp", confirm: true }),
      { params }
    );

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(r2Client.send).toHaveBeenCalled();
    expect(mockUpdateManuscript).toHaveBeenCalledWith(
      expect.objectContaining({
        cover_url: expect.any(String),
        cover_image_url: expect.any(String),
        metadata: expect.objectContaining({
          cover_history: expect.arrayContaining([
            "https://cdn.example.com/covers/acc-1/manu-1/current.webp",
          ]),
        }),
      })
    );
    expect(mockUpdateManuscriptEq).toHaveBeenCalledWith("id", "manu-1");
    expect(data.gallery_asset_id).toBe("gallery-1");
    expect(typeof data.cover_url).toBe("string");
  });
});
