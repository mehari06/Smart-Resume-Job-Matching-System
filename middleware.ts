import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const pathname = req.nextUrl.pathname;

        // Role-guard: /recruiter pages require RECRUITER or ADMIN role
        if (pathname.startsWith("/recruiter")) {
            const role = token?.role as string;
            if (role !== "RECRUITER" && role !== "ADMIN") {
                const url = req.nextUrl.clone();
                url.pathname = "/login";
                url.searchParams.set("callbackUrl", pathname);
                url.searchParams.set("error", "insufficient_role");
                return NextResponse.redirect(url);
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            // Only protect specific routes — public routes (/, /jobs, /api/jobs) stay open
            authorized({ token, req }) {
                const pathname = req.nextUrl.pathname;
                const protectedPaths = ["/dashboard", "/recruiter", "/profile", "/matches"];
                const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
                if (!isProtected) return true;
                return !!token;
            },
        },
        pages: {
            signIn: "/login",
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*", "/recruiter/:path*", "/profile/:path*", "/matches/:path*"],
};
