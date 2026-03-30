import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "../../../../lib/api-auth";
import { getAllResumes, searchResumesByJobDescription } from "../../../../lib/data";
import { recordServerError } from "../../../../lib/monitoring-server";

export const dynamic = "force-dynamic";

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
        const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

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

        const mlServiceUrl = process.env.ML_SERVICE_URL?.replace(/\/+$/, "");
        if (mlServiceUrl) {
            const resumes = await getAllResumes();
            const mlServiceApiKey = process.env.ML_SERVICE_API_KEY ?? process.env.FASTAPI_API_KEY;
            const mlRes = await fetch(`${mlServiceUrl}/recruiter-search`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    ...(mlServiceApiKey ? { "x-api-key": mlServiceApiKey } : {}),
                },
                body: JSON.stringify({
                    jobDescription: body.jobDescription,
                    resumes: resumes.map((r) => ({
                        id: r.id,
                        candidateName: r.candidateName,
                        targetRole: r.targetRole,
                        experienceYears: r.experienceYears,
                        education: r.education,
                        summary: r.summary ?? (r as any).parsedText,
                        skills: r.skills,
                        experience: r.experience,
                    })),
                    minScore: body.minScore ?? 30,
                    topK: 20,
                }),
            });

            if (mlRes.ok) {
                const json = (await mlRes.json()) as unknown;
                return NextResponse.json(json);
            }

            console.warn(
                "[POST /api/recruiter/search] ML service returned non-200, falling back",
                { status: mlRes.status }
            );
        }

        const results = await searchResumesByJobDescription(
            body.jobDescription,
            body.minScore ?? 30
        );

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
            algorithm: "Keyword overlap (dummy) - ML TF-IDF pending",
        });
    } catch (error) {
        console.error("[POST /api/recruiter/search]", error);
        await recordServerError({
            type: "next.recruiter_search_failed",
            message: "Recruiter search API failed",
            path: "/api/recruiter/search",
            error,
        });
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
