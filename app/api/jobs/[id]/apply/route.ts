import { NextRequest, NextResponse } from "next/server";
import { getAllJobs, getJobById, getResumeById } from "../../../../../lib/data";
import { isOwnerOrAdmin, requireSessionUser } from "../../../../../lib/api-auth";
import prisma from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

const MATCH_THRESHOLD = 34.9;

function isPlaceholderText(value: string): boolean {
    const v = value.trim();
    if (!v) return true;
    return /^analyzing\.{0,3}$/i.test(v) || /^unknown$/i.test(v);
}

type MlMatchItem = {
    job_title?: string;
    score?: number;
    job_idx?: number;
};

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

function toPercent(score?: number): number {
    if (typeof score !== "number") return 0;
    const bounded = Math.max(0, Math.min(1, score));
    return Math.round(bounded * 10000) / 100;
}

function computeMissingSkills(jobSkills: string[] = [], resumeSkills: string[] = []) {
    const resumeSet = new Set((resumeSkills ?? []).map((s) => s.toLowerCase().trim()));
    return (jobSkills ?? [])
        .filter((skill) => !resumeSet.has(skill.toLowerCase().trim()))
        .slice(0, 8);
}

function computeFallbackSimilarityScore(job: { title: string; description?: string; skills?: string[] }, resume: { skills?: string[] }, resumeText: string): number {
    const jobSkills = (job.skills ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean);
    const resumeSkillSet = new Set((resume.skills ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean));
    const matchedSkillCount = jobSkills.filter((s) => resumeSkillSet.has(s)).length;
    const skillRatio = jobSkills.length > 0 ? matchedSkillCount / jobSkills.length : 0;

    const titleTokens = job.title
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2);
    const text = resumeText.toLowerCase();
    const titleHits = titleTokens.filter((t) => text.includes(t)).length;
    const titleRatio = titleTokens.length > 0 ? titleHits / titleTokens.length : 0;

    // Skills dominate because this score is shown for a specific selected job.
    const blended = skillRatio * 0.9 + titleRatio * 0.1;
    // Keep heuristic fallback conservative so it stays close to dashboard ML scores.
    return Math.round(Math.max(0, Math.min(80, blended * 100)) * 100) / 100;
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const body = (await request.json()) as { resumeId?: string; submit?: boolean };
        const submit = body.submit === true;
        if (!body.resumeId) {
            return NextResponse.json({ error: "resumeId is required" }, { status: 400 });
        }

        const [resume, selectedJob] = await Promise.all([
            getResumeById(body.resumeId),
            getJobById(params.id),
        ]);

        if (!resume) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }
        if (!selectedJob) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
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
        const mappedAll = raw
            .map((item, index) => {
                const job =
                    (typeof item.job_idx === "number" ? jobs[item.job_idx] : undefined) ??
                    jobs.find((j) => j.title === item.job_title);
                const matchedSkills = (job?.skills ?? []).filter((skill) =>
                    (resume.skills ?? []).some((rs) => rs.toLowerCase() === skill.toLowerCase())
                );
                return {
                    jobId: job?.id,
                    jobTitle: job?.title ?? item.job_title ?? "Unknown role",
                    company: job?.company ?? "Unknown company",
                    similarityScore: toPercent(item.score),
                    rank: index + 1,
                    matchedSkills,
                    missingSkills: computeMissingSkills(job?.skills ?? [], resume.skills ?? []),
                    explanation: "Semantic ML match",
                };
            })
            .filter((m, idx, arr) => {
                const key = `${m.jobId ?? ""}:${m.jobTitle}`;
                return arr.findIndex((x) => `${x.jobId ?? ""}:${x.jobTitle}` === key) === idx;
            })
            .sort((a, b) => b.similarityScore - a.similarityScore)
            .map((m, idx) => ({ ...m, rank: idx + 1 }));

        const mapped = mappedAll
            .filter((m) => m.similarityScore >= MATCH_THRESHOLD);

        const selectedInTop = mapped.find((m) => m.jobId === selectedJob.id);
        const selectedInAll = mappedAll.find((m) => m.jobId === selectedJob.id);
        const fallbackScore = computeFallbackSimilarityScore(selectedJob, resume, resumeText);

        const selectedFallback = {
            jobId: selectedJob.id,
            jobTitle: selectedJob.title,
            company: selectedJob.company,
            similarityScore: fallbackScore,
            rank: mappedAll.length + 1,
            matchedSkills: (selectedJob.skills ?? []).filter((skill) =>
                (resume.skills ?? []).some((rs) => rs.toLowerCase() === skill.toLowerCase())
            ),
            missingSkills: computeMissingSkills(selectedJob.skills ?? [], resume.skills ?? []),
            explanation: "Direct job score (skill/title heuristic)",
        };

        const target = selectedInTop ?? selectedInAll ?? selectedFallback;
        const topSource = mappedAll.length > 0 ? mappedAll : [selectedFallback];
        const topScore = topSource[0]?.similarityScore ?? 0;
        const isTopMatch = target.jobId === topSource[0]?.jobId;

        const persistableBase = mappedAll.filter((m) => !!m.jobId);
        const selectedForPersistence = {
            jobId: selectedJob.id,
            jobTitle: target.jobTitle,
            company: target.company,
            similarityScore: target.similarityScore,
            rank: target.rank,
            matchedSkills: target.matchedSkills,
            missingSkills: target.missingSkills,
            explanation: target.explanation,
        };
        const persistableMap = new Map<string, typeof selectedForPersistence>();
        for (const m of persistableBase) {
            if (m.jobId) persistableMap.set(m.jobId, m as any);
        }
        persistableMap.set(selectedJob.id, selectedForPersistence);
        const persistable = Array.from(persistableMap.values())
            .sort((a, b) => a.rank - b.rank)
            .map((m, idx) => ({ ...m, rank: idx + 1 }));

        if (submit && persistable.length > 0) {
            try {
                const exists = await prisma.resume.findUnique({
                    where: { id: body.resumeId },
                    select: { id: true },
                });
                if (exists) {
                    await prisma.$transaction([
                        prisma.match.deleteMany({ where: { resumeId: body.resumeId } }),
                        prisma.match.createMany({
                            data: persistable.map((m) => ({
                                resumeId: body.resumeId as string,
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
                }
            } catch (e) {
                console.warn("[POST /api/jobs/[id]/apply] Match persistence failed", e);
            }
        }

        return NextResponse.json({
            data: {
                resumeId: body.resumeId,
                jobId: selectedJob.id,
                submitted: submit,
                targetJob: {
                    ...target,
                    isTopMatch,
                },
                topMatches: mappedAll,
                recommendations: mappedAll.filter((m) => m.jobId !== selectedJob.id).slice(0, 5),
                topScore,
                algorithm: "SentenceTransformer + Cosine Similarity",
                computedAt: computedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("[POST /api/jobs/[id]/apply]", error);
        return NextResponse.json({ error: "Failed to apply to job" }, { status: 500 });
    }
}
