import { NextRequest, NextResponse } from "next/server";
import { getMatchesByResumeId, getResumeById } from "../../../lib/data";
import { isOwnerOrAdmin, requireSessionUser } from "../../../lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/matches?resumeId=resume-001
 *
 * Returns top 5 pre-computed job matches for a given resume.
 * TODO: Replace with ML microservice call:
 *   const res = await fetch(`${process.env.ML_SERVICE_URL}/match`, { body: { resumeId } })
 */
export async function GET(request: NextRequest) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const { searchParams } = new URL(request.url);
        const resumeId = searchParams.get("resumeId");

        if (!resumeId) {
            return NextResponse.json(
                { error: "resumeId query parameter is required" },
                { status: 400 }
            );
        }

        const resume = await getResumeById(resumeId);
        if (!resume) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }

        if (!isOwnerOrAdmin(auth.user, resume.userId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const result = await getMatchesByResumeId(resumeId);

        if (!result) {
            return NextResponse.json({
                data: {
                    resumeId,
                    matches: [],
                    computedAt: new Date().toISOString(),
                    algorithm: "TF-IDF + Cosine Similarity (pending ML integration)",
                },
                message: "No pre-computed matches found. ML service will compute on upload.",
            });
        }

        return NextResponse.json({ data: result });
    } catch (error) {
        console.error("[GET /api/matches]", error);
        return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
    }
}
