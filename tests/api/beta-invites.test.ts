import { POST, GET } from "@/app/api/manuscripts/[id]/beta-invites/route";
import { DELETE } from "@/app/api/manuscripts/[id]/beta-invites/[tokenId]/route";
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("crypto", () => ({
  randomBytes: jest.fn(),
}));

type MockRequestOptions = {
  method?: string;
  body?: object | null;
};

function createMockRequest({ method = "POST", body = null }: MockRequestOptions = {}) {
  return {
    method,
    json: jest.fn().mockResolvedValue(body || {}),
    headers: {
      get: jest.fn().mockReturnValue("application/json"),
    },
  } as any;
}

describe("beta invite endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated (POST)", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Unauthorized" },
        }),
      },
    });

    const req = createMockRequest();
    const res = await POST(req, { params: Promise.resolve({ id: "manuscript-1" }) });
    expect(res.status).toBe(401);
  });

  it("creates a beta invite token (POST)", async () => {
    const insertSpy = jest.fn();

    (crypto.randomBytes as jest.Mock).mockReturnValue(Buffer.from("deadbeef", "hex"));

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-1" } },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === "users") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "user-1" }, error: null }),
              }),
            }),
          };
        }
        if (table === "beta_access_tokens") {
          return {
            insert: (payload: Record<string, unknown>) => {
              insertSpy(payload);
              return {
                select: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        id: "token-1",
                        token: "deadbeef",
                        manuscript_id: "manuscript-1",
                        permissions: "read",
                        expires_at: new Date().toISOString(),
                      },
                      error: null,
                    }),
                }),
              };
            },
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const req = createMockRequest({
      body: { permissions: "read" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "manuscript-1" }) });
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.token).toBe("deadbeef");
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        manuscript_id: "manuscript-1",
        created_by: "user-1",
        permissions: "read",
      })
    );
  });

  it("lists active beta invites (GET)", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-1" } },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === "users") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "user-1" }, error: null }),
              }),
            }),
          };
        }
        if (table === "beta_access_tokens") {
          return {
            select: () => ({
              eq: () => ({
                gt: () => ({
                  order: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: "token-1",
                          token: "deadbeef",
                          permissions: "comment",
                          expires_at: "2099-01-01T00:00:00Z",
                        },
                      ],
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const req = createMockRequest({ method: "GET" });
    const res = await GET(req, { params: Promise.resolve({ id: "manuscript-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it("revokes a beta invite (DELETE)", async () => {
    const deleteSpy = jest.fn();

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-1" } },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === "beta_access_tokens") {
          return {
            delete: () => ({
              eq: () => ({
                eq: () => {
                  deleteSpy();
                  return Promise.resolve({ error: null });
                },
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const req = createMockRequest({ method: "DELETE" });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "manuscript-1", tokenId: "token-1" }),
    });
    expect(res.status).toBe(200);
    expect(deleteSpy).toHaveBeenCalled();
  });
});
