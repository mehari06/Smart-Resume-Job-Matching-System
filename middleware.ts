import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const RECRUITER_ONLY_PATHS = ["/recruiter", "/jobs/new", "/api/recruiter"];
const SEEKER_ONLY_PATHS = ["/matches", "/upload"];

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
        return NextResponse.next();
    }

    const baseProtectedPrefixes = [
        "/dashboard",
        "/profile",
        "/recruiter",
        "/jobs/new",
        "/matches",
        "/upload",
        "/api/resumes",
        "/api/users/me",
        "/api/recruiter",
    ];

    const jobsWritePath = pathname === "/api/jobs" || /^\/api\/jobs\/[^/]+(?:\/.*)?$/.test(pathname);
    const needsAuth = hasPrefix(pathname, baseProtectedPrefixes) || (jobsWritePath && method !== "GET");
    if (!needsAuth) {
        return NextResponse.next();
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }

    const role = String((token as any).role ?? "SEEKER").toUpperCase();

    if (hasPrefix(pathname, RECRUITER_ONLY_PATHS) && role !== "RECRUITER" && role !== "ADMIN") {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (hasPrefix(pathname, SEEKER_ONLY_PATHS) && role === "RECRUITER") {
        return NextResponse.redirect(new URL("/recruiter", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/profile/:path*",
        "/recruiter/:path*",
        "/jobs/new/:path*",
        "/matches/:path*",
        "/upload/:path*",
        "/api/jobs/:path*",
        "/api/recruiter/:path*",
        "/api/resumes/:path*",
        "/api/users/me/:path*",
    ],
};
