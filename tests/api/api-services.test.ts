/**
 * @jest-environment node
 */
import { GET } from "@/app/api/services/request/route";
import { NextRequest } from "next/server";

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

import { createClient } from "@/utils/supabase/server";

describe("GET /api/services/request", () => {
  const mockSupabase = {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  };

  const createMockRequest = (url = "http://localhost:3000/api/services/request?user_id=me") =>
    new NextRequest(url);

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Unauthorized" },
    });

    const res = await GET(createMockRequest());
    expect(res.status).toBe(401);
  });

  it("returns orders for authenticated user", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    const mockOrders = [{ id: "req-1" }, { id: "req-2" }];
    const orderBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
    };
    mockSupabase.from.mockReturnValue(orderBuilder);

    const res = await GET(createMockRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual(mockOrders);
    expect(orderBuilder.eq).toHaveBeenCalledWith("user_id", user.id);
  });

  it("returns 403 when user_id param does not match authenticated user", async () => {
    const user = { id: "user-123" };
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    const res = await GET(
      createMockRequest("http://localhost:3000/api/services/request?user_id=other-user")
    );

    expect(res.status).toBe(403);
  });
});
