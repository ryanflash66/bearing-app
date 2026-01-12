/**
 * Tests for Middleware Logic
 * Story 4.5: Maintenance Mode Enforcement
 */

import { updateSession } from "@/utils/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";
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
    });

    it("allows request when maintenance is disabled", async () => {
        // Mock system_settings = { enabled: false }
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === "system_settings") {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { value: { enabled: false } } }),
                        }),
                    }),
                };
            }
            return { select: jest.fn() };
        });

        const response = await updateSession(mockRequest as any);
        // Should be NextResponse.next() which we mocked
        expect(NextResponse.next).toHaveBeenCalled();
        // Check status is undefined (default next()) or we check strict equality if we mocked it return obj
    });

    it("blocks POST request when maintenance is enabled and user is not super admin", async () => {
        // Maintenance enabled
         mockSupabase.from.mockImplementation((table: string) => {
            if (table === "system_settings") {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ 
                                data: { value: { enabled: true, message: "Down for maintenance" } } 
                            }),
                        }),
                    }),
                };
            }
            if (table === "users") { // Role check
                 return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { role: "user" } }),
                        }),
                    }),
                };
            }
            return { select: jest.fn() };
        });

        const response = await updateSession(mockRequest as any);
        
        expect(NextResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: "Down for maintenance" }),
            { status: 503 }
        );
    });

    it("allows POST request when maintenance is enabled if user IS super admin", async () => {
        // Maintenance enabled
         mockSupabase.from.mockImplementation((table: string) => {
            if (table === "system_settings") {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ 
                                data: { value: { enabled: true } } 
                            }),
                        }),
                    }),
                };
            }
            if (table === "users") { // Role check
                 return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { role: "super_admin" } }),
                        }),
                    }),
                };
            }
            return { select: jest.fn() };
        });

        const response = await updateSession(mockRequest as any);
        expect(NextResponse.next).toHaveBeenCalled();
    });

     it("allows GET request even if maintenance is enabled", async () => {
        mockRequest.method = "GET";
         mockSupabase.from.mockImplementation((table: string) => {
            if (table === "system_settings") {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ 
                                data: { value: { enabled: true } } 
                            }),
                        }),
                    }),
                };
            }
             return { select: jest.fn() };
        });

        const response = await updateSession(mockRequest as any);
        expect(NextResponse.next).toHaveBeenCalled();
        // Should NOT have checked users/role because maintenance check skipped for GET
        expect(mockSupabase.from).not.toHaveBeenCalledWith("users");
    });
});
