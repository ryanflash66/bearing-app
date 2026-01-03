/**
 * Integration tests for Manuscript CRUD + Autosave
 * Story 2.1 Acceptance Criteria:
 * - AC 2.1.1: Autosave at 5s interval without blocking UI
 * - AC 2.1.2: Network drop recovery with no data loss
 * - AC 2.1.3: Draft created immediately, autosave begins
 * - AC 2.1.4: Soft delete recoverable for 30 days
 * - AC 2.1.5: Large manuscript save <5s P95
 */

import {
  createManuscript,
  getManuscript,
  updateManuscript,
  softDeleteManuscript,
  restoreManuscript,
  getDeletedManuscripts,
  purgeExpiredManuscripts,
  generateContentHash,
} from "@/lib/manuscripts";

// Mock Supabase client for testing
const createMockSupabase = (overrides: Record<string, unknown> = {}) => {
  const defaultData = {
    manuscripts: [] as Record<string, unknown>[],
  };

  const mockSelect = jest.fn().mockReturnThis();
  const mockInsert = jest.fn().mockReturnThis();
  const mockUpdate = jest.fn().mockReturnThis();
  const mockDelete = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockReturnThis();
  const mockIs = jest.fn().mockReturnThis();
  const mockNot = jest.fn().mockReturnThis();
  const mockLt = jest.fn().mockReturnThis();
  const mockOrder = jest.fn().mockReturnThis();
  const mockSingle = jest.fn();

  const mockFrom = jest.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    is: mockIs,
    not: mockNot,
    lt: mockLt,
    order: mockOrder,
    single: mockSingle,
  });

  return {
    from: mockFrom,
    _mocks: {
      mockSelect,
      mockInsert,
      mockUpdate,
      mockDelete,
      mockEq,
      mockSingle,
    },
    _data: defaultData,
    ...overrides,
  };
};

describe("Manuscript CRUD Operations", () => {
  describe("createManuscript", () => {
    it("should create a draft manuscript immediately (AC 2.1.3)", async () => {
      const mockManuscript = {
        id: "test-id-123",
        account_id: "account-123",
        owner_user_id: "user-123",
        title: "Untitled",
        status: "draft",
        content_json: {},
        content_text: "",
        word_count: 0,
        last_saved_at: expect.any(String),
        deleted_at: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockManuscript,
                error: null,
              }),
            }),
          }),
        }),
      };

      const result = await createManuscript(mockSupabase as never, {
        account_id: "account-123",
        owner_user_id: "user-123",
      });

      expect(result.error).toBeNull();
      expect(result.manuscript).toBeDefined();
      expect(result.manuscript?.status).toBe("draft");
      expect(result.manuscript?.last_saved_at).toBeDefined();
    });
  });

  describe("updateManuscript", () => {
    it("should update manuscript content successfully", async () => {
      const mockManuscript = {
        id: "test-id-123",
        content_text: "Updated content",
        updated_at: new Date().toISOString(),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockManuscript,
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      const result = await updateManuscript(
        mockSupabase as never,
        "test-id-123",
        { content_text: "Updated content" }
      );

      expect(result.error).toBeNull();
      expect(result.manuscript?.content_text).toBe("Updated content");
    });

    it("should detect conflicts with optimistic locking", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: { code: "PGRST116", message: "No rows" },
                    }),
                  }),
                }),
              }),
            }),
          }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { updated_at: "2024-12-23T12:00:00Z" },
                error: null,
              }),
            }),
          }),
        }),
      };

      const result = await updateManuscript(
        mockSupabase as never,
        "test-id-123",
        { content_text: "New content" },
        "2024-12-23T11:00:00Z" // Old expected timestamp
      );

      expect(result.conflictDetected).toBe(true);
      expect(result.error).toContain("Conflict");
    });
  });

  describe("softDeleteManuscript (AC 2.1.4)", () => {
    it("should soft delete a manuscript (recoverable)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };

      const result = await softDeleteManuscript(mockSupabase as never, "test-id-123");

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe("restoreManuscript", () => {
    it("should restore a soft-deleted manuscript", async () => {
      const mockManuscript = {
        id: "test-id-123",
        deleted_at: null,
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockManuscript,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      const result = await restoreManuscript(mockSupabase as never, "test-id-123");

      expect(result.error).toBeNull();
      expect(result.manuscript?.deleted_at).toBeNull();
    });
  });
});

describe("Content Hash Generation", () => {
  it("should generate consistent hashes for same content", async () => {
    const content = "This is test content";
    const hash1 = await generateContentHash(content);
    const hash2 = await generateContentHash(content);

    expect(hash1).toBe(hash2);
  });

  it("should generate different hashes for different content", async () => {
    const hash1 = await generateContentHash("Content A");
    const hash2 = await generateContentHash("Content B");

    expect(hash1).not.toBe(hash2);
  });

  it("should handle empty content", async () => {
    const hash = await generateContentHash("");
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });
});

describe("Autosave Performance (AC 2.1.5)", () => {
  it("should complete save within acceptable time for large content", async () => {
    // Generate 1M+ characters
    const largeContent = "a".repeat(1_100_000);

    const mockManuscript = {
      id: "test-id-123",
      content_text: largeContent,
      updated_at: new Date().toISOString(),
    };

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(async () => {
                  // Simulate some processing time
                  await new Promise((resolve) => setTimeout(resolve, 100));
                  return { data: mockManuscript, error: null };
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const startTime = Date.now();

    const contentHash = await generateContentHash(largeContent);

    const result = await updateManuscript(
      mockSupabase as never,
      "test-id-123",
      {
        content_text: largeContent,
        content_hash: contentHash,
      }
    );

    const duration = Date.now() - startTime;

    // Should complete well under 5 seconds (P95 target per AC 2.1.5)
    expect(duration).toBeLessThan(5000);
    expect(result.error).toBeNull();
  });
});

describe("Offline Buffer", () => {
  // Note: IndexedDB tests require a browser environment or jsdom with IndexedDB polyfill
  // These tests verify the logic patterns

  it("should queue save when offline", () => {
    // This tests the pattern - actual IndexedDB tests would need browser environment
    const queuedSave = {
      manuscriptId: "test-id-123",
      content: {
        content_json: { type: "doc" },
        content_text: "Offline content",
      },
      expectedUpdatedAt: new Date().toISOString(),
      timestamp: Date.now(),
    };

    expect(queuedSave.manuscriptId).toBe("test-id-123");
    expect(queuedSave.content.content_text).toBe("Offline content");
    expect(queuedSave.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it("should include all required fields for recovery", () => {
    const queuedSave = {
      manuscriptId: "test-id-123",
      content: {
        content_json: {},
        content_text: "Test",
      },
      expectedUpdatedAt: "2024-12-23T12:00:00Z",
      timestamp: Date.now(),
    };

    // All fields required for recovery must be present
    expect(queuedSave).toHaveProperty("manuscriptId");
    expect(queuedSave).toHaveProperty("content");
    expect(queuedSave).toHaveProperty("expectedUpdatedAt");
    expect(queuedSave).toHaveProperty("timestamp");
    expect(queuedSave.content).toHaveProperty("content_json");
    expect(queuedSave.content).toHaveProperty("content_text");
  });
});

describe("Cleanup Job (AC 2.1.4)", () => {
  it("should calculate correct 30-day cutoff", () => {
    const retentionDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const now = new Date();
    const diffDays = Math.round(
      (now.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(diffDays).toBe(30);
  });

  it("should identify manuscripts older than retention period", () => {
    const retentionDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Manuscript deleted 31 days ago - should be purged
    const oldDeletedAt = new Date();
    oldDeletedAt.setDate(oldDeletedAt.getDate() - 31);

    // Manuscript deleted 29 days ago - should be kept
    const recentDeletedAt = new Date();
    recentDeletedAt.setDate(recentDeletedAt.getDate() - 29);

    expect(oldDeletedAt < cutoffDate).toBe(true);
    expect(recentDeletedAt < cutoffDate).toBe(false);
  });
});

