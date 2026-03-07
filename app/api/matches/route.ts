import { NextRequest, NextResponse } from "next/server";
import { getMatchesByResumeId } from "../../../lib/data";

/**
 * GET /api/matches?resumeId=resume-001
 *
 * Returns top 5 pre-computed job matches for a given resume.
 * TODO: Replace with ML microservice call:
 *   const res = await fetch(`${process.env.ML_SERVICE_URL}/match`, { body: { resumeId } })
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const resumeId = searchParams.get("resumeId");

        if (!resumeId) {
            return NextResponse.json(
                { error: "resumeId query parameter is required" },
                { status: 400 }
            );
        }

        // TODO: Add session check — user can only view their own matches
        // const session = await getServerSession(authOptions);
        // if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const result = await getMatchesByResumeId(resumeId);

        if (!result) {
            // Return empty matches rather than 404 for unknown resumes
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
