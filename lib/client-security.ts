"use client";

import { CSRF_COOKIE_NAME } from "./security-constants";

export function getCsrfTokenFromCookie() {
    if (typeof document === "undefined") return "";

    const encodedName = `${CSRF_COOKIE_NAME}=`;
    const match = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(encodedName));

    return match ? decodeURIComponent(match.slice(encodedName.length)) : "";
}

export function withCsrfHeaders(init: RequestInit = {}) {
    const token = getCsrfTokenFromCookie();
    const headers = new Headers(init.headers ?? {});

    if (token) {
        headers.set("x-csrf-token", token);
    }

    return {
        ...init,
        headers,
    } satisfies RequestInit;
}
