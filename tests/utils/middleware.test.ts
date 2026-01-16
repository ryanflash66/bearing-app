/**
 * Tests for Middleware Logic
 * Story 4.5: Maintenance Mode Enforcement
 */

import { updateSession, isPublicAuthorRoute } from "@/utils/supabase/middleware";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Mock dependencies
jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("next/server", () => ({
    NextResponse: {
        next: jest.fn().mockReturnValue({ cookies: { set: jest.fn() } }),
        redirect: jest.fn().mockReturnValue({ cookies: { delete: jest.fn() } }),
        json: jest.fn((body, init) => ({ body, status: init?.status })),
    },
    NextRequest: jest.fn(),
}));

// Mock the dynamic import module at top level
jest.mock("@/lib/super-admin", () => ({
    getMaintenanceStatus: jest.fn(),
    isSuperAdmin: jest.fn(),
}));

import { getMaintenanceStatus, isSuperAdmin } from "@/lib/super-admin";

describe("Middleware updateSession", () => {
    let mockSupabase: any;
    let mockRequest: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock Request
        mockRequest = {
            nextUrl: {
                pathname: "/api/some-endpoint",
                searchParams: new URLSearchParams(),
            },
            headers: new Headers(),
            cookies: {
                getAll: jest.fn().mockReturnValue([]),
                set: jest.fn(),
            },
            method: "POST", // Write method
            url: "http://localhost/api/some-endpoint",
        };

        // Mock Supabase
        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
            },
            from: jest.fn(),
        };

        (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
        
        // Default mock behaviors
        (getMaintenanceStatus as jest.Mock).mockResolvedValue({ enabled: false });
        (isSuperAdmin as jest.Mock).mockResolvedValue(false);
    });

    it("allows request when maintenance is disabled", async () => {
        (getMaintenanceStatus as jest.Mock).mockResolvedValue({ enabled: false });

        const response = await updateSession(mockRequest as any);
        expect(NextResponse.next).toHaveBeenCalled();
    });

    it("blocks POST request when maintenance is enabled and user is not super admin", async () => {
        (getMaintenanceStatus as jest.Mock).mockResolvedValue({ enabled: true, message: "Down for maintenance" });
        (isSuperAdmin as jest.Mock).mockResolvedValue(false);

        const response = await updateSession(mockRequest as any);
        
        expect(NextResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: "Down for maintenance" }),
            { status: 503 }
        );
    });

    it("allows POST request when maintenance is enabled if user IS super admin", async () => {
        (getMaintenanceStatus as jest.Mock).mockResolvedValue({ enabled: true });
        (isSuperAdmin as jest.Mock).mockResolvedValue(true);

        const response = await updateSession(mockRequest as any);
        expect(NextResponse.next).toHaveBeenCalled();
    });

     it("allows POST request to allowlisted path even when maintenance is enabled", async () => {
        // Even if enabled...
        (getMaintenanceStatus as jest.Mock).mockResolvedValue({ enabled: true });
        (isSuperAdmin as jest.Mock).mockResolvedValue(false);

        mockRequest.nextUrl.pathname = "/api/webhooks/stripe";
        mockRequest.url = "http://localhost/api/webhooks/stripe";
        
        const response = await updateSession(mockRequest as any);
        expect(NextResponse.next).toHaveBeenCalled();
        
        // Should NOT have called getMaintenanceStatus because it matches allowlist
        expect(getMaintenanceStatus).not.toHaveBeenCalled();
    });

    it("fails open (allows request) if maintenance check throws error", async () => {
         (getMaintenanceStatus as jest.Mock).mockRejectedValue(new Error("DB Error"));

        // Trigger maintenance check
        mockRequest.nextUrl.pathname = "/api/protected/action";
        
        const response = await updateSession(mockRequest as any);
        // Should catch error and proceed
        expect(NextResponse.next).toHaveBeenCalled();
    });
});

describe("Public author route detection", () => {
    it("matches author root and blog routes", () => {
        expect(isPublicAuthorRoute("/author-handle")).toBe(true);
        expect(isPublicAuthorRoute("/author-handle/blog")).toBe(true);
        expect(isPublicAuthorRoute("/author-handle/blog/my-first-post")).toBe(true);
    });

    it("rejects reserved and non-blog nested routes", () => {
        expect(isPublicAuthorRoute("/dashboard")).toBe(false);
        expect(isPublicAuthorRoute("/api/blog/posts")).toBe(false);
        expect(isPublicAuthorRoute("/login")).toBe(false);
        expect(isPublicAuthorRoute("/signup")).toBe(false);
        expect(isPublicAuthorRoute("/auth/callback")).toBe(false);
        expect(isPublicAuthorRoute("/_next/static")).toBe(false);
        expect(isPublicAuthorRoute("/favicon.ico")).toBe(false);
        expect(isPublicAuthorRoute("/author-handle/settings")).toBe(false);
        expect(isPublicAuthorRoute("/author-handle/blog/slug/extra")).toBe(false);
    });
});
