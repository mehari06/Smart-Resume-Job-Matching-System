import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import prisma from "../prisma";
import { getAllJobs, getMatchesByResumeId, getResumeById } from "../data";
import { buildRankedMatches, type MlMatchItem } from "../match-ranking";
import { buildMatchesResumeText } from "./matches-resume-text";
import { isOwnerOrAdmin, type SessionUser } from "../api-auth";

const MATCH_THRESHOLD = 25;

function getResumeIdFromRequest(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    return searchParams.get("resumeId");
}

function buildMlServiceConfig() {
    const mlServiceUrl = process.env.ML_SERVICE_URL?.replace(/\/+$/, "");
    const mlServiceApiKey = process.env.ML_SERVICE_API_KEY ?? process.env.FASTAPI_API_KEY;
    return { mlServiceUrl, mlServiceApiKey };
}

async function callMlService(params: {
    mlServiceUrl: string;
    mlServiceApiKey?: string;
    resumeText: string;
}) {
    const response = await fetch(`${params.mlServiceUrl}/match`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...(params.mlServiceApiKey ? { "x-api-key": params.mlServiceApiKey } : {}),
        },
        body: JSON.stringify({ resume_text: params.resumeText }),
        cache: "no-store",
    });

    return response;
}

function uniqueByJobId<T extends { jobId?: string }>(matches: T[]): T[] {
    const seen = new Set<string>();
    return matches.filter((match) => {
        if (!match.jobId) return false;
        if (seen.has(match.jobId)) return false;
        seen.add(match.jobId);
        return true;
    });
}

async function persistMatchesPrisma(params: {
    resumeId: string;
    computedAt: Date;
    persistable: Array<{
        jobId?: string;
        similarityScore: number;
        rank: number;
        matchedSkills: string[];
        missingSkills: string[];
        explanation?: string;
    }>;
}) {
    const exists = await prisma.resume.findUnique({
        where: { id: params.resumeId },
        select: { id: true },
    });

    if (!exists) {
        return { ok: false as const, reason: "resume_not_in_prisma" as const };
    }

    await prisma.$transaction([
        prisma.match.deleteMany({ where: { resumeId: params.resumeId } }),
        prisma.match.createMany({
            data: params.persistable.map((match) => ({
                resumeId: params.resumeId,
                jobId: match.jobId as string,
                score: match.similarityScore,
                rank: match.rank,
                matchedSkills: match.matchedSkills,
                missingSkills: match.missingSkills,
                explanation: match.explanation,
                computedAt: params.computedAt,
            })),
        }),
    ]);

    return { ok: true as const };
}

async function persistMatchesJsonFallback(params: {
    resumeId: string;
    candidateName?: string;
    computedAt: Date;
    matches: unknown;
}) {
    const matchesPath = path.join(process.cwd(), "data", "matches.json");

    const raw = await fs.readFile(matchesPath, "utf8").catch(() => "{}");
    let allMatches: Record<string, any> = {};

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            allMatches = parsed as Record<string, any>;
        }
    } catch {
        allMatches = {};
    }

    allMatches[params.resumeId] = {
        resumeId: params.resumeId,
        candidateName: params.candidateName ?? "User",
        matches: params.matches,
        computedAt: params.computedAt.toISOString(),
    };

    await fs.writeFile(matchesPath, JSON.stringify(allMatches, null, 4), "utf8");
}

async function persistMatches(params: {
    resumeId: string;
    candidateName?: string;
    computedAt: Date;
    matches: any[];
}) {
    const persistable = uniqueByJobId(params.matches);

    try {
        const prismaResult = await persistMatchesPrisma({
            resumeId: params.resumeId,
            computedAt: params.computedAt,
            persistable,
        });

        if (prismaResult.ok) return;
        throw new Error(prismaResult.reason);
    } catch (error) {
        console.warn("[GET /api/matches] Prisma persistence failed, falling back to JSON storage", error);
        try {
            await persistMatchesJsonFallback({
                resumeId: params.resumeId,
                candidateName: params.candidateName,
                computedAt: params.computedAt,
                matches: params.matches,
            });
        } catch (jsonError) {
            console.error("[GET /api/matches] JSON fallback storage failed", jsonError);
        }
    }
}

export async function getMatchesResponse(request: NextRequest, user: SessionUser) {
    const resumeId = getResumeIdFromRequest(request);
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

    if (!isOwnerOrAdmin(user, resume.userId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { mlServiceUrl, mlServiceApiKey } = buildMlServiceConfig();
    if (!mlServiceUrl) {
        return NextResponse.json({ error: "ML service is not configured" }, { status: 503 });
    }

    const resumeText = buildMatchesResumeText(resume as any);
    if (!resumeText || resumeText.length < 25) {
        return NextResponse.json(
            { error: "Resume has no parsed content yet. Re-upload to parse text first." },
            { status: 422 }
        );
    }

    const jobs = await getAllJobs();

    const mlResponse = await callMlService({
        mlServiceUrl,
        mlServiceApiKey: mlServiceApiKey || undefined,
        resumeText,
    });

    if (!mlResponse.ok) {
        const detail = await mlResponse.text().catch(() => "");
        const hint =
            mlResponse.status === 401
                ? "Unauthorized from ML service. Ensure ML_SERVICE_API_KEY (or FASTAPI_API_KEY) matches backend FASTAPI_API_KEY."
                : undefined;
        return NextResponse.json(
            { error: "ML service failed to compute matches", detail, hint },
            { status: 502 }
        );
    }

    const raw = (await mlResponse.json()) as MlMatchItem[];
    const computedAt = new Date();
    const mapped = buildRankedMatches({
        raw,
        jobs,
        resumeText,
        resumeSkills: resume.skills ?? [],
        threshold: MATCH_THRESHOLD,
        minFallback: 3,
    });

    await persistMatches({
        resumeId,
        candidateName: resume.candidateName,
        computedAt,
        matches: mapped,
    });

    const result = await getMatchesByResumeId(resumeId);
    if (result) {
        return NextResponse.json({ data: result });
    }

    return NextResponse.json({
        data: {
            resumeId,
            candidateName: resume.candidateName ?? "User",
            targetRole: resume.targetRole,
            matches: mapped,
            computedAt: computedAt.toISOString(),
            algorithm: "SentenceTransformer + Cosine Similarity",
        },
    });
}
