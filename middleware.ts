import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { applySecurityHeaders, ensureCsrfCookie } from "./lib/security";

const RECRUITER_ONLY_PATHS = ["/recruiter", "/jobs/new", "/api/recruiter/jobs", "/api/recruiter/applicants"];
const SEEKER_ONLY_PATHS = ["/matches", "/upload"];
const ADMIN_ONLY_PATHS = ["/admin", "/api/admin"];
// Paths that need auth but are NOT role-restricted (any logged-in user can access)
const AUTH_BUT_OPEN_PATHS = ["/recruiter-pending", "/api/recruiter/request-access"];

function hasPrefix(pathname: string, prefixes: string[]) {
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const method = request.method.toUpperCase();

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/images") ||
        pathname.includes(".")
    ) {
        return applySecurityHeaders(NextResponse.next());
    }

    const baseProtectedPrefixes = [
        "/dashboard",
        "/profile",
        "/recruiter",
        "/recruiter-pending",
        "/jobs/new",
        "/matches",
        "/upload",
        "/api/resumes",
        "/api/users/me",
        "/api/recruiter",
        "/api/cloudinary/sign",
        "/api/notifications",
        "/api/matches",
        "/admin",
        "/api/admin",
    ];

    const jobsWritePath = pathname === "/api/jobs" || /^\/api\/jobs\/[^/]+(?:\/.*)?$/.test(pathname);
    const needsAuth = hasPrefix(pathname, baseProtectedPrefixes) || (jobsWritePath && method !== "GET");
    const nextResponse = NextResponse.next();
    ensureCsrfCookie(request, nextResponse);
    applySecurityHeaders(nextResponse);

    if (!needsAuth || pathname.startsWith("/api/auth/")) {
        return nextResponse;
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        if (pathname.startsWith("/api/")) {
            return applySecurityHeaders(
                NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            );
        }
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
        const response = NextResponse.redirect(loginUrl);
        ensureCsrfCookie(request, response);
        return applySecurityHeaders(response);
    }

    const role = String((token as any).role ?? "SEEKER").toUpperCase();

    // Skip role-check for open auth paths (e.g., recruiter-pending waiting page)
    if (hasPrefix(pathname, AUTH_BUT_OPEN_PATHS)) {
        return nextResponse;
    }

    if (hasPrefix(pathname, RECRUITER_ONLY_PATHS) && role !== "RECRUITER" && role !== "ADMIN") {
        if (pathname.startsWith("/api/")) {
            return applySecurityHeaders(
                NextResponse.json({ error: "Forbidden" }, { status: 403 })
            );
        }
        // Send non-recruiter users to the pending waiting page instead of a login error
        const pendingUrl = new URL("/recruiter-pending", request.url);
        const response = NextResponse.redirect(pendingUrl);
        ensureCsrfCookie(request, response);
        return applySecurityHeaders(response);
    }

    if (hasPrefix(pathname, ADMIN_ONLY_PATHS) && role !== "ADMIN") {
        if (pathname.startsWith("/api/")) {
            return applySecurityHeaders(
                NextResponse.json({ error: "Forbidden" }, { status: 403 })
            );
        }
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("error", "insufficient_role");
        loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
        const response = NextResponse.redirect(loginUrl);
        ensureCsrfCookie(request, response);
        return applySecurityHeaders(response);
    }

    if (hasPrefix(pathname, SEEKER_ONLY_PATHS) && role === "RECRUITER") {
        const response = NextResponse.redirect(new URL("/recruiter", request.url));
        ensureCsrfCookie(request, response);
        return applySecurityHeaders(response);
    }

    return nextResponse;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
