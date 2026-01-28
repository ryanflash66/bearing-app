/**
 * @jest-environment node
 */
import {
  getActiveServiceRequest,
  hasActiveServiceRequest,
  cancelServiceRequest,
  getActiveServiceRequestsForManuscripts,
  ACTIVE_STATUSES,
  isActiveStatus,
} from "@/lib/service-requests";
import { SupabaseClient } from "@supabase/supabase-js";

describe("service-requests lib", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a chainable mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
    };
  });

  describe("ACTIVE_STATUSES constant", () => {
    it("contains pending, paid, and in_progress", () => {
      expect(ACTIVE_STATUSES).toContain("pending");
      expect(ACTIVE_STATUSES).toContain("paid");
      expect(ACTIVE_STATUSES).toContain("in_progress");
      expect(ACTIVE_STATUSES).toHaveLength(3);
    });
  });

  describe("isActiveStatus", () => {
    it("returns true for active statuses", () => {
      expect(isActiveStatus("pending")).toBe(true);
      expect(isActiveStatus("paid")).toBe(true);
      expect(isActiveStatus("in_progress")).toBe(true);
    });

    it("returns false for inactive statuses", () => {
      expect(isActiveStatus("completed")).toBe(false);
      expect(isActiveStatus("cancelled")).toBe(false);
      expect(isActiveStatus("failed")).toBe(false);
    });

    it("returns false for unknown statuses", () => {
      expect(isActiveStatus("unknown")).toBe(false);
      expect(isActiveStatus("")).toBe(false);
    });
  });

  describe("getActiveServiceRequest", () => {
    it("returns the active request when one exists", async () => {
      const mockRequest = {
        id: "req-123",
        manuscript_id: "ms-456",
        status: "pending",
        service_type: "cover_design",
        user_id: "user-789",
      };

      mockSupabase.maybeSingle.mockResolvedValue({
        data: mockRequest,
        error: null,
      });

      const result = await getActiveServiceRequest(mockSupabase, "ms-456");

      expect(result.request).toEqual(mockRequest);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith("service_requests");
      expect(mockSupabase.eq).toHaveBeenCalledWith("manuscript_id", "ms-456");
      expect(mockSupabase.in).toHaveBeenCalledWith("status", ACTIVE_STATUSES);
    });

    it("returns null when no active request exists", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getActiveServiceRequest(mockSupabase, "ms-456");

      expect(result.request).toBeNull();
      expect(result.error).toBeNull();
    });

    it("returns error when query fails", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await getActiveServiceRequest(mockSupabase, "ms-456");

      expect(result.request).toBeNull();
      expect(result.error).toBe("Database error");
    });
  });

  describe("hasActiveServiceRequest", () => {
    it("returns true when an active request exists", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: "req-123" },
        error: null,
      });

      const result = await hasActiveServiceRequest(mockSupabase, "ms-456");

      expect(result).toBe(true);
    });

    it("returns false when no active request exists", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await hasActiveServiceRequest(mockSupabase, "ms-456");

      expect(result).toBe(false);
    });
  });

  describe("cancelServiceRequest", () => {
    it("successfully cancels a pending request", async () => {
      const mockExisting = {
        id: "req-123",
        status: "pending",
        user_id: "user-789",
      };

      const mockCancelled = {
        ...mockExisting,
        status: "cancelled",
      };

      // First call: fetch existing request
      mockSupabase.single.mockResolvedValueOnce({
        data: mockExisting,
        error: null,
      });

      // Second call: update result
      mockSupabase.single.mockResolvedValueOnce({
        data: mockCancelled,
        error: null,
      });

      const result = await cancelServiceRequest(mockSupabase, "req-123");

      expect(result.request).toEqual(mockCancelled);
      expect(result.error).toBeNull();
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: "cancelled" });
    });

    it("returns error when request is not pending", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "req-123", status: "paid" },
        error: null,
      });

      const result = await cancelServiceRequest(mockSupabase, "req-123");

      expect(result.request).toBeNull();
      expect(result.error).toContain("paid");
      expect(result.error).toContain("pending");
    });

    it("returns error when request not found", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await cancelServiceRequest(mockSupabase, "req-123");

      expect(result.request).toBeNull();
      expect(result.error).toBe("Service request not found");
    });

    it("returns error when RLS blocks the update", async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: "req-123", status: "pending" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116", message: "No rows returned" },
        });

      const result = await cancelServiceRequest(mockSupabase, "req-123");

      expect(result.request).toBeNull();
      expect(result.error).toContain("permission");
    });
  });

  describe("getActiveServiceRequestsForManuscripts", () => {
    it("returns a map of manuscript IDs to requests", async () => {
      const mockRequests = [
        { id: "req-1", manuscript_id: "ms-1", status: "pending" },
        { id: "req-2", manuscript_id: "ms-3", status: "in_progress" },
      ];

      // Chain .in() calls: first returns supabase, second returns data
      mockSupabase.in
        .mockImplementationOnce(() => mockSupabase)
        .mockImplementationOnce(() => ({
          data: mockRequests,
          error: null,
        }));

      const result = await getActiveServiceRequestsForManuscripts(
        mockSupabase,
        ["ms-1", "ms-2", "ms-3"]
      );

      expect(result.size).toBe(2);
      expect(result.get("ms-1")).toEqual(mockRequests[0]);
      expect(result.get("ms-3")).toEqual(mockRequests[1]);
      expect(result.has("ms-2")).toBe(false);
    });

    it("returns empty map for empty manuscript list", async () => {
      const result = await getActiveServiceRequestsForManuscripts(mockSupabase, []);

      expect(result.size).toBe(0);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("returns empty map on query error", async () => {
      mockSupabase.in
        .mockImplementationOnce(() => mockSupabase)
        .mockImplementationOnce(() => ({
          data: null,
          error: { message: "Database error" },
        }));

      const result = await getActiveServiceRequestsForManuscripts(
        mockSupabase,
        ["ms-1"]
      );

      expect(result.size).toBe(0);
    });
  });
});
