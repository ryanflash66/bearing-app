/**
 * @jest-environment node
 */
import { PATCH } from "@/app/api/services/request/[id]/route";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase-admin", () => ({
  getServiceSupabaseClient: jest.fn(),
}));

jest.mock("@/lib/super-admin", () => ({
  isSuperAdmin: jest.fn(),
}));

jest.mock("@/lib/email", () => ({
  notifyOrderStatusChange: jest.fn(),
}));

import { createClient } from "@/utils/supabase/server";
import { getServiceSupabaseClient } from "@/lib/supabase-admin";
import { isSuperAdmin } from "@/lib/super-admin";
import { notifyOrderStatusChange } from "@/lib/email";

describe("PATCH /api/services/request/[id]", () => {
  let mockSupabase: any;
  let mockAdminClient: any;
  let selectBuilder: any;
  let updateBuilder: any;
  let insertBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: { getUser: jest.fn() },
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Mock builders
    updateBuilder = {
      eq: jest.fn().mockResolvedValue({ error: null }),
    };

    selectBuilder = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    
    // Notifications insert builder
    insertBuilder = {
        insert: jest.fn().mockResolvedValue({ error: null })
    };

    mockAdminClient = {
      from: jest.fn((table) => {
        if (table === "service_requests") {
          return {
            select: jest.fn().mockReturnValue(selectBuilder),
            update: jest.fn().mockReturnValue(updateBuilder),
          };
        }
        if (table === "notifications") {
            return insertBuilder;
        }
        return {
            select: jest.fn().mockReturnThis(),
        };
      }),
    };
    (getServiceSupabaseClient as jest.Mock).mockReturnValue(mockAdminClient);
  });

  const createMockRequest = (body: any) => {
    return new NextRequest("http://localhost:3000/api/services/request/req-123", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  };

  const params = Promise.resolve({ id: "req-123" });

  it("returns 403 if user is not super admin", async () => {
    (isSuperAdmin as jest.Mock).mockResolvedValue(false);
    
    const req = createMockRequest({ status: "in_progress" });
    const res = await PATCH(req, { params });
    
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid status", async () => {
    (isSuperAdmin as jest.Mock).mockResolvedValue(true);
    
    const req = createMockRequest({ status: "invalid_status" });
    const res = await PATCH(req, { params });
    
    expect(res.status).toBe(400);
  });

  it("updates status and sends email when status changes", async () => {
    (isSuperAdmin as jest.Mock).mockResolvedValue(true);
    
    // Mock existing request
    selectBuilder.single.mockResolvedValue({
      data: {
        id: "req-123",
        status: "pending",
        service_type: "cover_design",
        users: { id: "user-1", email: "user@example.com", auth_id: "auth-1" },
        metadata: {},
      },
      error: null,
    });
    
    const req = createMockRequest({ status: "in_progress", adminNotes: "Started work" });
    const res = await PATCH(req, { params });
    
    expect(res.status).toBe(200);
    
    // Verify DB update
    expect(updateBuilder.eq).toHaveBeenCalledWith("id", "req-123");
    
    // Verify notification record creation
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "service_update",
        entity_id: "req-123",
      })
    );
    
    // Verify email sent
    expect(notifyOrderStatusChange).toHaveBeenCalledWith(
      "user@example.com",
      "req-123",
      "cover_design",
      "in_progress",
      "Started work"
    );
  });

  it("does not send email if status is unchanged", async () => {
    (isSuperAdmin as jest.Mock).mockResolvedValue(true);
    
    selectBuilder.single.mockResolvedValue({
      data: {
        id: "req-123",
        status: "in_progress", // Same as update
        service_type: "cover_design",
        users: { id: "user-1", email: "user@example.com" },
        metadata: { admin_notes: "Old note" },
      },
      error: null,
    });
    
    const req = createMockRequest({ status: "in_progress", adminNotes: "New note" });
    const res = await PATCH(req, { params });
    
    expect(res.status).toBe(200);
    
    // Email should NOT be called
    expect(notifyOrderStatusChange).not.toHaveBeenCalled();
    
    // DB update should still happen (for metadata/notes)
    expect(updateBuilder.eq).toHaveBeenCalledWith("id", "req-123");
  });
});