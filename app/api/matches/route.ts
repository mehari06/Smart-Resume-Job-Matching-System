import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "../../../lib/api-auth";
import { getMatchesResponse } from "../../../lib/services/matches-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) return auth.error;

        return await getMatchesResponse(request, auth.user);
    } catch (error) {
        console.error("[GET /api/matches]", error);
        return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
    }
}

