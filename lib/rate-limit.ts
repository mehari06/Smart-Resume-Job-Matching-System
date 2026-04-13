import { NextRequest, NextResponse } from "next/server";

type RateLimitOptions = {
    bucket: string;
    limit: number;
    windowMs: number;
    userId?: string | null;
    message?: string;
};

type BucketState = {
    count: number;
    resetAt: number;
};

declare global {
    // eslint-disable-next-line no-var
    var __smartResumeRateLimitStore: Map<string, BucketState> | undefined;
}

function getStore() {
    if (!globalThis.__smartResumeRateLimitStore) {
        globalThis.__smartResumeRateLimitStore = new Map<string, BucketState>();
    }
    return globalThis.__smartResumeRateLimitStore;
}

export function getClientIp(request: NextRequest) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0]?.trim() || "unknown";
    }

    return request.headers.get("x-real-ip") ?? "unknown";
}

export function enforceRateLimit(request: NextRequest, options: RateLimitOptions) {
    const store = getStore();
    const now = Date.now();
    const actor = options.userId || getClientIp(request);
    const key = `${options.bucket}:${actor}`;
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
        store.set(key, {
            count: 1,
            resetAt: now + options.windowMs,
        });
        return null;
    }

    if (existing.count >= options.limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        return NextResponse.json(
            { error: options.message ?? "Too many requests" },
            {
                status: 429,
                headers: {
                    "Retry-After": String(retryAfterSeconds),
                },
            }
        );
    }

    existing.count += 1;
    store.set(key, existing);
    return null;
}
