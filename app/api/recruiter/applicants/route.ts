import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { requireSessionUser } from "../../../../lib/api-auth";
import prisma from "../../../../lib/prisma";
import { getAccountProfile } from "../../../../lib/user-profile-store";
import { withTimeout, DB_TIMEOUT } from "../../../../lib/data";

export const dynamic = "force-dynamic";
const DEFAULT_RECRUITER_EMAIL = "mbereket523@gmail.com";

export async function GET(request: NextRequest) {
    try {
        const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

        let jobs: any[] = [];
        let resumes: any[] = [];
        let matchesMap: Record<string, any> = {};
        let allApplicants: any[] = [];
        let usedPrisma = true;

        try {
            // Live Path: Fetch jobs owned by user and their matches
            const ownedJobs = await withTimeout(
                prisma.job.findMany({
                    where: auth.user.role === "ADMIN" ? {} : { postedById: auth.user.id },
                    select: { id: true, title: true, company: true }
                }),
                DB_TIMEOUT,
                "getOwnedJobsForApplicants"
            );

            if (ownedJobs.length > 0) {
                const jobIds = ownedJobs.map(j => j.id);
                const matches = await withTimeout(
                    prisma.match.findMany({
                        where: { jobId: { in: jobIds } },
                        include: {
                            job: { select: { id: true, title: true, company: true } },
                            resume: {
                                include: {
                                    user: {
                                        select: { id: true, name: true, email: true, image: true }
                                    }
                                }
                            }
                        },
                        orderBy: { computedAt: "desc" }
                    }),
                    DB_TIMEOUT,
                    "getMatchesForApplicants"
                );

                allApplicants = matches.map(m => ({
                    matchId: m.id,
                    jobId: m.jobId,
                    jobTitle: m.job.title,
                    company: m.job.company,
                    score: m.score,
                    rank: m.rank,
                    matchedSkills: m.matchedSkills,
                    missingSkills: m.missingSkills,
                    explanation: m.explanation,
                    computedAt: m.computedAt.toISOString(),
                    user: m.resume.user,
                    resume: {
                        id: m.resume.id,
                        fileName: m.resume.fileName,
                        fileUrl: m.resume.fileUrl,
                        uploadedAt: m.resume.uploadedAt.toISOString(),
                        targetRole: m.resume.targetRole,
                        experienceYears: m.resume.experienceYears,
                        skills: m.resume.skills,
                    }
                }));
            }
        } catch (e) {
            usedPrisma = false;
            console.warn("[GET /api/recruiter/applicants] Prisma failed; using JSON fallback", e);
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

            const jobsList = JSON.parse(jobsRaw) as any[];
            resumes = JSON.parse(resumesRaw) as any[];
            matchesMap = JSON.parse(matchesRaw) as Record<string, any>;

            // In fallback mode, we assume all jobs are "owned" by the default recruiter
            const collected: any[] = [];
            for (const [resumeId, result] of Object.entries(matchesMap)) {
                for (const matchEntry of (result?.matches ?? [])) {
                    const job = jobsList.find(j => j.id === matchEntry.jobId);
                    if (!job) continue;

                    const resume = resumes.find(r => r.id === resumeId);
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
                        matchId: `${resumeId}-${job.id}`,
                        jobId: job.id,
                        jobTitle: job.title,
                        company: job.company,
                        score: Number(matchEntry.similarityScore ?? 0),
                        rank: Number(matchEntry.rank ?? 0),
                        matchedSkills: matchEntry.matchedSkills ?? [],
                        missingSkills: matchEntry.missingSkills ?? [],
                        explanation: matchEntry.explanation ?? "",
                        computedAt: result?.computedAt ?? new Date().toISOString(),
                        user: {
                            id: mappedResume.userId ?? mappedResume.id,
                            name: mappedResume.candidateName ?? "Candidate",
                            email: mappedResume.email ?? null,
                            image: null,
                        },
                        resume: {
                            id: mappedResume.id,
                            fileName: mappedResume.fileName,
                            fileUrl: mappedResume.fileUrl,
                            uploadedAt: mappedResume.uploadedAt,
                            targetRole: mappedResume.targetRole,
                            experienceYears: mappedResume.experienceYears,
                            skills: mappedResume.skills ?? [],
                        }
                    });
                }
            }
            allApplicants = collected.sort((a, b) => new Date(b.computedAt).getTime() - new Date(a.computedAt).getTime());
        }

        // Enrich with profile data if possible
        const enrichedApplicants = await Promise.all(
            allApplicants.map(async (applicant) => {
                const profile = await getAccountProfile(applicant.user.id);
                return {
                    ...applicant,
                    user: {
                        ...applicant.user,
                        firstName: profile?.firstName,
                        lastName: profile?.lastName,
                        city: profile?.city,
                        age: profile?.age,
                        education: profile?.education,
                        fieldOfStudy: profile?.fieldOfStudy,
                        isStudent: profile?.isStudent,
                    }
                };
            })
        );

        return NextResponse.json({
            data: enrichedApplicants,
            total: enrichedApplicants.length
        });

    } catch (error) {
        console.error("[GET /api/recruiter/applicants]", error);
        return NextResponse.json({ error: "Failed to load all applicants" }, { status: 500 });
    }
}
