import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { requireSessionUser } from "../../../../../../lib/api-auth";
import prisma from "../../../../../../lib/prisma";
import { getAccountProfile } from "../../../../../../lib/user-profile-store";
import { withTimeout, DB_TIMEOUT } from "../../../../../../lib/data";

export const dynamic = "force-dynamic";
const DEFAULT_RECRUITER_EMAIL = "mbereket523@gmail.com";

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
            job = await withTimeout(
                prisma.job.findUnique({
                    where: { id: params.id },
                    select: { id: true, postedById: true, title: true, company: true },
                }),
                DB_TIMEOUT,
                "getJobForCandidates"
            );
            if (!job) {
                return NextResponse.json({ error: "Job not found" }, { status: 404 });
            }

            const normalizedEmail = (auth.user.email ?? "").trim().toLowerCase();
            const defaultOwner = await withTimeout(
                prisma.user.findUnique({
                    where: { email: DEFAULT_RECRUITER_EMAIL },
                    select: { id: true },
                }),
                DB_TIMEOUT,
                "getDefaultOwnerForCandidates"
            );
            const isDefaultRecruiter =
                normalizedEmail === DEFAULT_RECRUITER_EMAIL ||
                (defaultOwner?.id !== undefined && auth.user.id === defaultOwner.id);
            const isJobOwnedByDefaultRecruiter =
                defaultOwner?.id !== undefined && job.postedById === defaultOwner.id;

            if (auth.user.role !== "ADMIN" && !isDefaultRecruiter && !(auth.user.role === "RECRUITER" && isJobOwnedByDefaultRecruiter) && job.postedById !== auth.user.id) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            rows = await withTimeout(
                prisma.match.findMany({
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
                }),
                DB_TIMEOUT,
                "getMatchesForCandidates"
            );
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

            const collected: any[] = [];
            for (const [resumeId, result] of Object.entries(matchesMap)) {
                const matchEntry = (result?.matches ?? []).find((m: any) => m?.jobId === params.id);
                if (!matchEntry) continue;
                const resume = resumes.find((r) => r.id === resumeId);
                // Allow fallback if resume is missing from resumes.json but present in matches.json
                const mappedResume = resume || {
                    id: resumeId,
                    userId: result.userId || resumeId,
                    fileName: `${result.candidateName || "Candidate"}_resume.pdf`,
                    fileUrl: "#",
                    uploadedAt: result.computedAt,
                    targetRole: result.targetRole || "Unknown Role",
                    experienceYears: 0,
                    skills: [],
                    candidateName: result.candidateName || "Candidate",
                    email: null,
                };
                collected.push({
                    id: `${resumeId}-${params.id}`,
                    score: Number(matchEntry.similarityScore ?? 0),
                    rank: Number(matchEntry.rank ?? 0),
                    matchedSkills: matchEntry.matchedSkills ?? [],
                    missingSkills: matchEntry.missingSkills ?? [],
                    explanation: matchEntry.explanation ?? "",
                    computedAt: new Date(result?.computedAt ?? Date.now()),
                    resume: {
                        id: mappedResume.id,
                        userId: mappedResume.userId,
                        fileName: mappedResume.fileName,
                        fileUrl: mappedResume.fileUrl,
                        uploadedAt: new Date(mappedResume.uploadedAt ?? Date.now()),
                        targetRole: mappedResume.targetRole,
                        experienceYears: mappedResume.experienceYears,
                        skills: mappedResume.skills ?? [],
                        user: {
                            id: mappedResume.userId ?? mappedResume.id,
                            name: mappedResume.candidateName ?? "Candidate",
                            email: mappedResume.email ?? null,
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
                        fileUrl: row.resume.fileUrl,
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
