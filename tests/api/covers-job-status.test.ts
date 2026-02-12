/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/covers/jobs/[jobId]/route";
import { createClient } from "@/utils/supabase/server";

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

describe("GET /api/covers/jobs/[jobId]", () => {
  const params = Promise.resolve({ jobId: "job-1" });

  beforeEach(() => {
    process.env.R2_PUBLIC_URL = "https://cdn.example.com";
  });

  it("returns 401 when unauthenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const response = await GET(new NextRequest("http://localhost/api/covers/jobs/job-1"), { params });
    expect(response.status).toBe(401);
  });

  it("returns job payload with completed_images for progressive rendering", async () => {
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
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: "job-1",
                    status: "running",
                    images: [
                      { storage_path: "tmp/covers/m/1.webp", safety_status: "ok", seed: 1 },
                      { error: "blocked" },
                    ],
                    retry_after: null,
                    error_message: null,
                    selected_url: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const response = await GET(new NextRequest("http://localhost/api/covers/jobs/job-1"), { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("running");
    expect(data.images).toHaveLength(2);
    expect(data.completed_images).toEqual([
      {
        storage_path: "tmp/covers/m/1.webp",
        url: "https://cdn.example.com/tmp/covers/m/1.webp",
        safety_status: "ok",
        seed: 1,
      },
    ]);
  });
});
