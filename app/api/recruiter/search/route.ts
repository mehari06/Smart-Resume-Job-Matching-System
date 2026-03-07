import { NextRequest, NextResponse } from "next/server";
import { searchResumesByJobDescription } from "../../../../lib/data";

/**
 * POST /api/recruiter/search
 * Body: { jobDescription: string, minScore?: number }
 *
 * Returns resumes ranked by keyword overlap.
 * TODO: Replace with real ML microservice:
 *   POST ${ML_SERVICE_URL}/recruiter-search { jobDescription }
 */
export async function POST(request: NextRequest) {
    try {
        // TODO: Check RECRUITER role
        // const session = await getServerSession(authOptions);
        // if (!session || session.user.role !== 'RECRUITER') {
        //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        // }

        const body = (await request.json()) as {
            jobDescription?: string;
            minScore?: number;
        };

        if (!body.jobDescription || body.jobDescription.trim().length < 20) {
            return NextResponse.json(
                { error: "Job description must be at least 20 characters" },
                { status: 400 }
            );
        }

        const results = await searchResumesByJobDescription(
            body.jobDescription,
            body.minScore ?? 30
        );

        // Strip sensitive fields from recruiter view
        const safeResults = results.map(({ resume, matchScore, matchedSkills }) => ({
            resumeId: resume.id,
            candidateName: resume.candidateName,
            targetRole: resume.targetRole,
            experienceYears: resume.experienceYears,
            skills: resume.skills,
            education: resume.education,
            matchScore,
            matchedSkills,
        }));

        return NextResponse.json({
            data: safeResults,
            total: safeResults.length,
            algorithm: "Keyword overlap (dummy) — ML TF-IDF pending",
        });
    } catch (error) {
        console.error("[POST /api/recruiter/search]", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
