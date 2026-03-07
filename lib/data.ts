/**
 * Data access helpers — reads from JSON files in /data directory.
 * These are the "dummy data" layer. When the ML service and Prisma DB
 * are connected, replace these functions with DB queries.
 */

import { cache } from "react";
import type { Job, Resume, MatchResult, JobFilters } from "../types";
import prisma from "./prisma";

const loadJson = cache(<T>(filename: string): T => {
    // In Next.js API routes, require() works for JSON files
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`../data/${filename}.json`) as T;
});

function mapPrismaResume(resume: any): Resume {
    return {
        id: resume.id,
        userId: resume.userId,
        candidateName: resume.user?.name ?? "User",
        email: resume.user?.email ?? undefined,
        targetRole: resume.targetRole ?? undefined,
        experienceYears: resume.experienceYears ?? undefined,
        skills: resume.skills ?? [],
        fileName: resume.fileName,
        fileUrl: resume.fileUrl,
        uploadedAt: resume.uploadedAt.toISOString(),
    };
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const getAllJobs = cache(async (): Promise<Job[]> => {
    try {
        const jobs = await prisma.job.findMany({
            where: { isActive: true },
            orderBy: { postedAt: "desc" },
        });

        if (jobs.length > 0) {
            return jobs.map((j: any) => ({
                ...j,
                id: j.id,
                type: j.type as any,
                source: j.source as any,
                salary: j.salary ?? undefined,
                category: j.category ?? "Engineering",
                experience: (j.experience as any) ?? "Mid-level",
                postedAt: j.postedAt.toISOString(),
                deadline: j.deadline?.toISOString(),
            }));
        }
    } catch (e) {
        console.warn("Prisma fallback to JSON jobs", e);
    }
    return loadJson<Job[]>("jobs");
});

export const getJobById = cache(async (id: string): Promise<Job | undefined> => {
    try {
        const job = await prisma.job.findUnique({ where: { id } });
        if (job) {
            return {
                ...job,
                type: job.type as any,
                source: job.source as any,
                salary: job.salary ?? undefined,
                category: job.category ?? "Engineering",
                experience: (job.experience as any) ?? "Mid-level",
                postedAt: job.postedAt.toISOString(),
                deadline: job.deadline?.toISOString(),
            };
        }
    } catch (e) {
        console.warn("Prisma fallback to JSON job by id", e);
    }
    const jobs = await getAllJobs();
    return jobs.find((j) => j.id === id);
});

export async function getFilteredJobs(
    filters: JobFilters = {},
    page = 1,
    pageSize = 9
): Promise<{ jobs: Job[]; total: number; totalPages: number }> {
    let jobs = await getAllJobs();

    if (filters.search) {
        const q = filters.search.toLowerCase();
        jobs = jobs.filter(
            (j) =>
                j.title.toLowerCase().includes(q) ||
                j.company.toLowerCase().includes(q) ||
                j.skills.some((s) => s.toLowerCase().includes(q))
        );
    }
    if (filters.category) {
        jobs = jobs.filter((j) => j.category === filters.category);
    }
    if (filters.source) {
        jobs = jobs.filter((j) => j.source === filters.source);
    }
    if (filters.experience) {
        jobs = jobs.filter((j) => j.experience === filters.experience);
    }
    if (filters.type) {
        jobs = jobs.filter((j) => j.type === filters.type);
    }

    const total = jobs.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginated = jobs.slice((page - 1) * pageSize, page * pageSize);

    return { jobs: paginated, total, totalPages };
}

export async function getJobCategories(): Promise<string[]> {
    const jobs = await getAllJobs();
    return Array.from(new Set(jobs.map((j) => j.category).filter(Boolean) as string[])).sort();
}

// ─── Resumes ──────────────────────────────────────────────────────────────────

export const getAllResumes = cache(async (): Promise<Resume[]> => {
    try {
        const resumes = await prisma.resume.findMany({
            where: { isActive: true },
            orderBy: { uploadedAt: "desc" },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (resumes.length > 0) {
            return resumes.map(mapPrismaResume);
        }
    } catch (e) {
        console.warn("Prisma fallback to JSON resumes", e);
    }
    return loadJson<Resume[]>("resumes");
});

export const getResumeById = cache(async (id: string): Promise<Resume | undefined> => {
    try {
        const resume = await prisma.resume.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (resume) {
            return mapPrismaResume(resume);
        }
    } catch (e) {
        console.warn("Prisma fallback to JSON resume by id", e);
    }
    const resumes = await getAllResumes();
    return resumes.find((r: any) => r.id === id);
});

export const getResumesByUserId = cache(async (userId: string): Promise<Resume[]> => {
    try {
        const resumes = await prisma.resume.findMany({
            where: { userId, isActive: true },
            orderBy: { uploadedAt: "desc" },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (resumes.length > 0) {
            return resumes.map(mapPrismaResume);
        }
    } catch (e) {
        console.warn("Prisma fallback to JSON resumes by user", e);
    }
    const resumes = await getAllResumes();
    return resumes.filter((r: any) => r.userId === userId);
});

// ─── Matches ──────────────────────────────────────────────────────────────────

export const getMatchesByResumeId = cache(async (resumeId: string): Promise<MatchResult | undefined> => {
    try {
        const matches = await prisma.match.findMany({
            where: { resumeId },
            include: { job: true },
            orderBy: { rank: "asc" },
            take: 5,
        });
        if (matches.length > 0) {
            // Transform Prisma Match into MatchResult format
            return {
                resumeId,
                candidateName: "User", // This should come from user/resume relation
                matches: matches.map((m: any) => ({
                    jobId: m.jobId,
                    jobTitle: m.job.title,
                    company: m.job.company,
                    similarityScore: m.score,
                    rank: m.rank ?? 0,
                    matchedSkills: m.matchedSkills,
                    missingSkills: m.missingSkills,
                    explanation: m.explanation ?? "",
                }))
            } as any;
        }
    } catch (e) {
        console.warn("Prisma fallback to JSON matches", e);
    }
    const allMatches = loadJson<Record<string, MatchResult>>("matches");
    return allMatches[resumeId];
});

// ─── Recruiter search (simulated) ─────────────────────────────────────────────
// When ML is integrated, this calls the Python microservice.
// For now: keyword-based overlap scoring.

export async function searchResumesByJobDescription(
    jobDescription: string,
    minScore = 50
): Promise<Array<{
    resume: Resume;
    matchScore: number;
    matchedSkills: string[];
}>> {
    const resumes = await getAllResumes();
    const descWords = jobDescription.toLowerCase().split(/\W+/).filter((w) => w.length > 3);

    return resumes
        .map((resume: any) => {
            const matchedSkills = resume.skills.filter((skill: string) =>
                descWords.some((word) => skill.toLowerCase().includes(word))
            );
            const matchScore = Math.min(
                100,
                Math.round((matchedSkills.length / Math.max(resume.skills.length, 1)) * 100 + Math.random() * 10)
            );
            return { resume, matchScore, matchedSkills };
        })
        .filter((r: any) => r.matchScore >= minScore)
        .sort((a: any, b: any) => b.matchScore - a.matchScore);
}
