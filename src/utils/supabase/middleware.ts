import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/", "/login", "/signup", "/auth"];

const reservedRoutePrefixes = [
  "/api",
  "/dashboard",
  "/login",
  "/signup",
  "/auth",
  "/_next",
];

export function isPublicAuthorRoute(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  if (pathname === "/favicon.ico") return false;

  const lowerPath = pathname.toLowerCase();
  const isReserved = reservedRoutePrefixes.some(
    (prefix) => lowerPath === prefix || lowerPath.startsWith(`${prefix}/`)
  );
  if (isReserved) return false;

  const segments = pathname.split("/").filter(Boolean);
  // /@handle - author profile
  if (segments.length === 1) return true;

  const secondSegment = segments[1]?.toLowerCase();

  // /@handle/blog or /@handle/blog/[slug] - author blog pages
  if (secondSegment === "blog") {
    return segments.length === 2 || segments.length === 3;
  }

  // /@handle/[book-slug] - book landing page (Story 7.4)
  // Allows exactly 2 segments where second is the book slug
  if (segments.length === 2) {
    return true;
  }

  return false;
}

// Routes that require authentication
const protectedRoutes = ["/dashboard"];

// Routes that require admin role (subset of protected routes)
const adminRoutes = ["/dashboard/admin"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Check if path matches protected routes
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if path matches public routes
  const isPublicRoute =
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    ) || isPublicAuthorRoute(pathname);

  // Handle unauthenticated access to protected routes
  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    
    // Add return URL so user can be redirected back after login
    loginUrl.searchParams.set("returnUrl", pathname);
    
    // If there was an auth error (expired session), add message
    if (authError) {
      loginUrl.searchParams.set("message", "session_expired");
    }
    
    // Clear any stale session cookies
    const redirectResponse = NextResponse.redirect(loginUrl);
    
    // Clear auth cookies on redirect
    const cookieNames = request.cookies.getAll().map((c) => c.name);
    cookieNames
      .filter((name) => name.startsWith("sb-"))
      .forEach((name) => {
        redirectResponse.cookies.delete(name);
      });
    
    return redirectResponse;
  }

  // Redirect authenticated users away from login/signup
  if (user && (pathname === "/login" || pathname === "/signup")) {
    // Check for returnUrl in query params
    const returnUrl = request.nextUrl.searchParams.get("returnUrl");
    const redirectTo = returnUrl || "/dashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Story 4.5: Global Maintenance Mode Check
  // Block write operations (POST, PUT, DELETE, PATCH) when maintenance is enabled
  const isWriteMethod = ["POST", "PUT", "DELETE", "PATCH"].includes(request.method);
  
  // Allowlist for system routes that must bypass maintenance
  // Use regex for precise matching to avoid prefix collisions (e.g. /auth-debug)
  const isBypassedPath = [
    /^\/api\/auth(\/|$)/,      // /api/auth or /api/auth/*
    /^\/auth(\/|$)/,           // /auth or /auth/*
    /^\/api\/webhooks(\/|$)/,  // /api/webhooks or /api/webhooks/*
    /^\/api\/internal(\/|$)/,  // /api/internal or /api/internal/*
  ].some(regex => regex.test(pathname));

  if (isWriteMethod && !isBypassedPath) {
    try {
      // Use shared helper to get status (AC 4.5.3)
      const { getMaintenanceStatus, isSuperAdmin } = await import("@/lib/super-admin");
      const status = await getMaintenanceStatus(supabase);

      if (status.enabled) {
        // exempt super admins
        let isSuper = false;
        if (user) {
          isSuper = await isSuperAdmin(supabase);
        }

        if (!isSuper) {
          return NextResponse.json(
            { error: status.message || "System is under maintenance. Please try again later." },
            { status: 503 }
          );
        }
      }
    } catch (err) {
      // CODE REVIEW FIX: Fail open. 
      // If DB check fails, we assume maintenance is OFF to prevent accidental lockout.
      console.error("Maintenance check failed in middleware (failing open):", err);
    }
  }

  return response;
}
