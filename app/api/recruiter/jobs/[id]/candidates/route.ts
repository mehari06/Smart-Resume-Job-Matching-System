import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { requireSessionUser } from "../../../../../../lib/api-auth";
import prisma from "../../../../../../lib/prisma";
import { getAccountProfile } from "../../../../../../lib/user-profile-store";
import { getSignedResumeAssetUrl } from "../../../../../../lib/cloudinary";

export const dynamic = "force-dynamic";

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

        let job:
            | { id: string; postedById: string | null; title: string; company: string }
            | null = null;
        let rows: any[] = [];
        let usedPrisma = true;

        try {
            job = await prisma.job.findUnique({
                where: { id: params.id },
                select: { id: true, postedById: true, title: true, company: true },
            });
            if (!job) {
                return NextResponse.json({ error: "Job not found" }, { status: 404 });
            }

            if (auth.user.role !== "ADMIN" && job.postedById !== auth.user.id) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            rows = await prisma.match.findMany({
                where: { jobId: params.id },
                orderBy: [{ score: "desc" }, { computedAt: "desc" }],
                include: {
                    resume: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    image: true,
                                },
                            },
                        },
                    },
                },
            });
        } catch (e) {
            usedPrisma = false;
            console.warn("[GET /api/recruiter/jobs/[id]/candidates] Prisma failed; using JSON fallback", e);
        }

        if (!usedPrisma) {
            const jobsPath = path.join(process.cwd(), "data", "jobs.json");
            const resumesPath = path.join(process.cwd(), "data", "resumes.json");
            const matchesPath = path.join(process.cwd(), "data", "matches.json");

            const [jobsRaw, resumesRaw, matchesRaw] = await Promise.all([
                fs.readFile(jobsPath, "utf8").catch(() => "[]"),
                fs.readFile(resumesPath, "utf8").catch(() => "[]"),
                fs.readFile(matchesPath, "utf8").catch(() => "{}"),
            ]);

            const jobs = JSON.parse(jobsRaw) as any[];
            const resumes = JSON.parse(resumesRaw) as any[];
            const matchesMap = JSON.parse(matchesRaw) as Record<string, any>;
            const foundJob = jobs.find((j) => j.id === params.id);
            if (!foundJob) {
                return NextResponse.json({ error: "Job not found" }, { status: 404 });
            }

            if (auth.user.role !== "ADMIN" && foundJob.postedById !== auth.user.id) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            const collected: any[] = [];
            for (const [resumeId, result] of Object.entries(matchesMap)) {
                const matchEntry = (result?.matches ?? []).find((m: any) => m?.jobId === params.id);
                if (!matchEntry) continue;
                const resume = resumes.find((r) => r.id === resumeId);
                if (!resume) continue;
                collected.push({
                    id: `${resumeId}-${params.id}`,
                    score: Number(matchEntry.similarityScore ?? 0),
                    rank: Number(matchEntry.rank ?? 0),
                    matchedSkills: matchEntry.matchedSkills ?? [],
                    missingSkills: matchEntry.missingSkills ?? [],
                    explanation: matchEntry.explanation ?? "",
                    computedAt: new Date(result?.computedAt ?? Date.now()),
                    resume: {
                        id: resume.id,
                        userId: resume.userId,
                        fileName: resume.fileName,
                        fileUrl: resume.fileUrl,
                        uploadedAt: new Date(resume.uploadedAt ?? Date.now()),
                        targetRole: resume.targetRole,
                        experienceYears: resume.experienceYears,
                        skills: resume.skills ?? [],
                        user: {
                            id: resume.userId ?? resume.id,
                            name: resume.candidateName ?? "Candidate",
                            email: resume.email ?? null,
                            image: null,
                        },
                    },
                });
            }
            rows = collected.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
            job = {
                id: foundJob.id,
                postedById: null,
                title: foundJob.title,
                company: foundJob.company,
            };
        }

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        const candidates = await Promise.all(
            rows.map(async (row) => {
                const profile = await getAccountProfile(row.resume.userId);
                return {
                    matchId: row.id,
                    score: row.score,
                    rank: row.rank,
                    matchedSkills: row.matchedSkills,
                    missingSkills: row.missingSkills,
                    explanation: row.explanation,
                    computedAt: row.computedAt.toISOString(),
                    user: {
                        id: row.resume.user.id,
                        name: row.resume.user.name,
                        email: row.resume.user.email,
                        image: row.resume.user.image,
                        firstName: profile?.firstName,
                        lastName: profile?.lastName,
                        city: profile?.city,
                        age: profile?.age,
                        education: profile?.education,
                        fieldOfStudy: profile?.fieldOfStudy,
                        isStudent: profile?.isStudent,
                    },
                    resume: {
                        id: row.resume.id,
                        fileName: row.resume.fileName,
                        fileUrl: getSignedResumeAssetUrl(row.resume.filePublicId, row.resume.fileUrl),
                        uploadedAt: row.resume.uploadedAt.toISOString(),
                        targetRole: row.resume.targetRole,
                        experienceYears: row.resume.experienceYears,
                        skills: row.resume.skills,
                    },
                };
            })
        );

        return NextResponse.json({
            data: {
                job: {
                    id: job.id,
                    title: job.title,
                    company: job.company,
                },
                candidates,
            },
        });
    } catch (error) {
        console.error("[GET /api/recruiter/jobs/[id]/candidates]", error);
        return NextResponse.json({ error: "Failed to load candidates" }, { status: 500 });
    }
}
