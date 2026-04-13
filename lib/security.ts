import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME } from "./security-constants";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isProduction() {
    return process.env.NODE_ENV === "production";
}

function normalizeOrigin(origin: string | null) {
    if (!origin) return null;
    try {
        const url = new URL(origin);
        return `${url.protocol}//${url.host}`;
    } catch {
        return null;
    }
}

export function createCsrfToken() {
    const first = crypto.randomUUID().replace(/-/g, "");
    const second = crypto.randomUUID().replace(/-/g, "");
    return `${first}${second}`;
}

export function applySecurityHeaders(response: NextResponse) {
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (isProduction()) {
        response.headers.set(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload"
        );
    }

    return response;
}

export function ensureCsrfCookie(request: NextRequest, response: NextResponse) {
    const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const token = existingToken || createCsrfToken();

    if (!existingToken) {
        response.cookies.set({
            name: CSRF_COOKIE_NAME,
            value: token,
            httpOnly: false,
            sameSite: "strict",
            secure: isProduction(),
            path: "/",
        });
    }

    return token;
}

export function validateSameOrigin(request: NextRequest) {
    const origin = normalizeOrigin(request.headers.get("origin"));
    const host = request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const expectedOrigin = host ? `${proto}://${host}` : null;

    if (!origin || !expectedOrigin || origin !== expectedOrigin) {
        return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    return null;
}

export function validateCsrf(request: NextRequest) {
    if (SAFE_METHODS.has(request.method.toUpperCase())) {
        return null;
    }

    const originError = validateSameOrigin(request);
    if (originError) {
        return originError;
    }

    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = request.headers.get("x-csrf-token");

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    return null;
}

export function serverError(message = "Request failed", status = 500) {
    return NextResponse.json({ error: message }, { status });
}
