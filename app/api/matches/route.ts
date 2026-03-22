import { NextRequest, NextResponse } from "next/server";
import { getAllJobs, getMatchesByResumeId, getResumeById } from "../../../lib/data";
import { isOwnerOrAdmin, requireSessionUser } from "../../../lib/api-auth";
import prisma from "../../../lib/prisma";
import { buildRankedMatches, type MlMatchItem } from "../../../lib/match-ranking";

export const dynamic = "force-dynamic";
const MATCH_THRESHOLD = 25;

function isPlaceholderText(value: string): boolean {
    const v = value.trim();
    if (!v) return true;
    return /^analyzing\.{0,3}$/i.test(v) || /^unknown$/i.test(v);
}

function toResumeText(resume: any): string {
    const parts: string[] = [];
    if (typeof resume.candidateName === "string" && !isPlaceholderText(resume.candidateName)) parts.push(resume.candidateName);
    if (typeof resume.targetRole === "string" && !isPlaceholderText(resume.targetRole)) parts.push(resume.targetRole);
    if (typeof resume.summary === "string" && !isPlaceholderText(resume.summary)) parts.push(resume.summary);
    if (typeof resume.parsedText === "string" && !isPlaceholderText(resume.parsedText)) parts.push(resume.parsedText);
    if (Array.isArray(resume.skills) && resume.skills.length) {
        parts.push(resume.skills.join(" "));
    }
    if (Array.isArray(resume.experience) && resume.experience.length) {
        parts.push(
            resume.experience
                .map((e: any) => `${e?.title ?? ""} ${e?.company ?? ""}`)
                .join(" ")
        );
    }
    return parts.join("\n").trim();
}

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

        const mlServiceUrl = process.env.ML_SERVICE_URL?.replace(/\/+$/, "");
        if (!mlServiceUrl) {
            return NextResponse.json({ error: "ML service is not configured" }, { status: 503 });
        }

        const resumeText = toResumeText(resume);
        if (!resumeText || resumeText.length < 25) {
            return NextResponse.json(
                { error: "Resume has no parsed content yet. Re-upload to parse text first." },
                { status: 422 }
            );
        }

        const jobs = await getAllJobs();
        const mlRes = await fetch(`${mlServiceUrl}/match`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                ...(process.env.ML_SERVICE_API_KEY
                    ? { "x-api-key": process.env.ML_SERVICE_API_KEY }
                    : {}),
            },
            body: JSON.stringify({ resume_text: resumeText }),
            cache: "no-store",
        });

        if (!mlRes.ok) {
            const detail = await mlRes.text().catch(() => "");
            return NextResponse.json(
                { error: "ML service failed to compute matches", detail },
                { status: 502 }
            );
        }

        const raw = (await mlRes.json()) as MlMatchItem[];
        const computedAt = new Date();
        const mapped = buildRankedMatches({
            raw,
            jobs,
            resumeText,
            resumeSkills: resume.skills ?? [],
            threshold: MATCH_THRESHOLD,
            minFallback: 3,
        });

        const rawPersistable = mapped.filter((m) => !!m.jobId);
        const seenJobIds = new Set<string>();
        const persistable = rawPersistable.filter(m => {
            if (seenJobIds.has(m.jobId as string)) return false;
            seenJobIds.add(m.jobId as string);
            return true;
        });

        try {
            // Check if resume exists in Prisma. If not, don't try to save matches there (P2003)
            const exists = await prisma.resume.findUnique({ where: { id: resumeId }, select: { id: true } });
            
            if (exists) {
                await prisma.$transaction([
                    prisma.match.deleteMany({ where: { resumeId } }),
                    prisma.match.createMany({
                        data: persistable.map((m) => ({
                            resumeId,
                            jobId: m.jobId as string,
                            score: m.similarityScore,
                            rank: m.rank,
                            matchedSkills: m.matchedSkills,
                            missingSkills: m.missingSkills,
                            explanation: m.explanation,
                            computedAt,
                        })),
                    }),
                ]);
            } else {
                console.warn(`[GET /api/matches] Resume ${resumeId} not found in Prisma. Skipping DB persistence.`);
                throw new Error("Resume not in Prisma"); // Trigger JSON fallback
            }
        } catch (prismaError) {
            console.warn("[GET /api/matches] Prisma persistence failed, falling back to JSON storage", prismaError);
            try {
                const fs = await import("node:fs/promises");
                const path = await import("node:path");
                const matchesPath = path.join(process.cwd(), "data", "matches.json");
                const rawMatches = await fs.readFile(matchesPath, "utf8").catch(() => "{}");
                const allMatches = JSON.parse(rawMatches);
                
                allMatches[resumeId] = {
                    resumeId,
                    candidateName: resume.candidateName ?? "User",
                    matches: mapped,
                    computedAt: computedAt.toISOString(),
                };
                
                await fs.writeFile(matchesPath, JSON.stringify(allMatches, null, 4), "utf8");
                console.log("[GET /api/matches] Saved matches to JSON fallback successfully");
            } catch (jsonError) {
                console.error("[GET /api/matches] JSON fallback storage also failed", jsonError);
            }
        }

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
    } catch (error) {
        console.error("[GET /api/matches]", error);
        return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
    }
}
