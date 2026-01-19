/**
 * @jest-environment node
 */
import { POST } from "@/app/api/admin/moderation/suspend/route";
import { createClient } from "@/utils/supabase/server";
import { notifyBlogPostSuspended } from "@/lib/email";
import { NextResponse } from "next/server";

// Mock dependencies
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/email", () => ({
  notifyBlogPostSuspended: jest.fn(),
}));

describe("POST /api/admin/moderation/suspend", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      rpc: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (notifyBlogPostSuspended as jest.Mock).mockResolvedValue({ success: true });
  });

  it("returns 401 if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const request = new Request("http://localhost/api/admin/moderation/suspend", {
      method: "POST",
      body: JSON.stringify({ postId: "post-123" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("calls suspend_blog_post RPC and sends email on success", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-user" } } });
    mockSupabase.rpc.mockResolvedValue({
      data: { success: true, post_id: "post-123", author_email: "author@example.com", title: "My Post" },
      error: null,
    });

    const request = new Request("http://localhost/api/admin/moderation/suspend", {
      method: "POST",
      body: JSON.stringify({ postId: "post-123", reason: "Spam" }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.emailSent).toBe(true);

    expect(mockSupabase.rpc).toHaveBeenCalledWith("suspend_blog_post", {
      p_post_id: "post-123",
      p_reason: "Spam",
    });

    expect(notifyBlogPostSuspended).toHaveBeenCalledWith("author@example.com", "My Post", "Spam");
  });

  it("returns error if RPC fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-user" } } });
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    const request = new Request("http://localhost/api/admin/moderation/suspend", {
      method: "POST",
      body: JSON.stringify({ postId: "post-123" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400); // 400 default for general error
  });
});
