import { NextRequest, NextResponse } from "next/server";

export async function readJsonBody(request: NextRequest): Promise<
    | { ok: true; body: unknown }
    | { ok: false; response: NextResponse }
> {
    try {
        const body = (await request.json()) as unknown;
        return { ok: true, body };
    } catch {
        return {
            ok: false,
            response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
        };
    }
}

