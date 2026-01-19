import { POST } from "@/app/api/beta/comments/route";
import { createClient } from "@supabase/supabase-js";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

function createMockRequest(body: object, headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
    json: jest.fn().mockResolvedValue(body),
  } as any;
}

describe("POST /api/beta/comments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects when token header is missing", async () => {
    const req = createMockRequest({
      manuscriptId: "manuscript-1",
      selectedText: "Hello",
      commentText: "Nice",
      authorName: "Reader",
      type: "General Feedback",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects when token is invalid", async () => {
    (createClient as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    const req = createMockRequest(
      {
        manuscriptId: "manuscript-1",
        selectedText: "Hello",
        commentText: "Nice",
        authorName: "Reader",
        type: "General Feedback",
      },
      { "x-beta-token": "token-123", "content-type": "application/json" }
    );

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("inserts beta comment when token is valid", async () => {
    const insertSpy = jest.fn();

    (createClient as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: [
          {
            manuscript_id: "manuscript-1",
            permissions: "comment",
          },
        ],
        error: null,
      }),
      from: () => ({
        insert: (payload: Record<string, unknown>) => {
          insertSpy(payload);
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id: "comment-1" }, error: null }),
            }),
          };
        },
      }),
    });

    const req = createMockRequest(
      {
        manuscriptId: "manuscript-1",
        selectedText: "Hello",
        commentText: "Nice",
        authorName: "Reader",
        type: "General Feedback",
      },
      { "x-beta-token": "token-123", "content-type": "application/json" }
    );

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        manuscript_id: "manuscript-1",
        selected_text: "Hello",
        comment_text: "Nice",
        author_name: "Reader",
        type: "General Feedback",
      })
    );
  });
});
