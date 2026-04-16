/**
 * Data access helpers — reads from JSON files in /data directory.
 * These are the "dummy data" layer. When the ML service and Prisma DB
 * are connected, replace these functions with DB queries.
 */

import fs from "node:fs";
import path from "node:path";

import type { Job, Resume, MatchResult, JobFilters } from "../types";
import prisma from "./prisma";

// --- Timeout utilities (used by API routes for safe DB queries) ---
export const DB_TIMEOUT = 8000; // 8 seconds

export function withTimeout<T>(promise: Promise<T>, ms: number, label = "query"): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`DB_TIMEOUT: ${label} exceeded ${ms}ms`)), ms)
        ),
    ]);
}

function cache<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) {
    if (process.env.NODE_ENV !== "production") {
        return fn;
    }
    const memo = new Map<string, TResult>();
    return (...args: TArgs): TResult => {
        const key = args.length === 1 && typeof args[0] === "string" ? args[0] : JSON.stringify(args);
        if (memo.has(key)) return memo.get(key) as TResult;
        const result = fn(...args);
        memo.set(key, result);
        return result;
    };
}

function noCache<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) {
    return fn;
}

const loadJson = <T>(filename: string): T => {
    const filePath = path.join(process.cwd(), "data", `${filename}.json`);
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
};

function mapPrismaResume(resume: any): Resume {
    return {
        id: resume.id,
        userId: resume.userId,
        candidateName: resume.user?.name ?? "User",
        email: resume.user?.email ?? undefined,
        targetRole: resume.targetRole ?? undefined,
        experienceYears: resume.experienceYears ?? undefined,
        skills: resume.skills ?? [],
        summary: resume.parsedText?.slice(0, 2000) ?? undefined,
        parsedText: resume.parsedText ?? undefined,
        fileName: resume.fileName,
        fileUrl: resume.fileUrl,
        uploadedAt: resume.uploadedAt.toISOString(),
    };
}

type CategoryRule = {
    category: string;
    keywords: string[];
};

const CATEGORY_RULES: CategoryRule[] = [
    { category: "AI/ML", keywords: ["machine learning", "ml", "ai", "nlp", "deep learning", "pytorch", "tensorflow", "llm"] },
    { category: "Data Science", keywords: ["data scientist", "data science", "scikit", "pandas", "analytics", "statistic"] },
    { category: "Data", keywords: ["data analyst", "bi analyst", "power bi", "tableau", "dashboard", "sql"] },
    { category: "DevOps", keywords: ["devops", "kubernetes", "docker", "terraform", "ci/cd", "sre"] },
    { category: "Security", keywords: ["security", "cyber", "soc", "siem", "penetration", "cissp"] },
    { category: "Cloud", keywords: ["cloud", "aws", "azure", "gcp", "solution architect"] },
    { category: "Networking", keywords: ["network", "ccna", "cisco", "bgp", "mpls", "active directory", "windows server"] },
    { category: "Database", keywords: ["database", "dba", "postgresql", "mysql", "query tuning"] },
    { category: "Mobile", keywords: ["mobile", "react native", "android", "ios"] },
    { category: "Frontend Engineering", keywords: ["frontend", "front-end", "react", "next.js", "vue", "angular", "tailwind"] },
    { category: "Fullstack Engineering", keywords: ["full stack", "fullstack", "node.js", "express", "backend", "api"] },
    { category: "Design", keywords: ["ui/ux", "ui ux", "designer", "figma", "wireframe", "prototype"] },
    { category: "QA", keywords: ["qa", "quality assurance", "test automation", "playwright", "cypress", "selenium"] },
    { category: "Product", keywords: ["product manager", "product owner", "roadmap", "prd"] },
    { category: "Management", keywords: ["scrum", "agile coach", "project manager", "team lead"] },
    { category: "Content", keywords: ["content writer", "seo", "copywriter", "journalism"] },
    { category: "Blockchain", keywords: ["blockchain", "solidity", "ethereum", "web3"] },
    { category: "Hardware/IoT", keywords: ["embedded", "iot", "arduino", "stm32", "sensor", "firmware"] },
    { category: "Healthcare", keywords: ["doctor", "medical", "nurse", "hospital", "clinic", "pharmacist", "physician"] },
];

function inferCategory(job: Partial<Job>): string {
    const text = [
        job.title ?? "",
        job.description ?? "",
        Array.isArray(job.skills) ? job.skills.join(" ") : "",
    ]
        .join(" ")
        .toLowerCase();

    let bestCategory = "";
    let bestScore = 0;

    for (const rule of CATEGORY_RULES) {
        const score = rule.keywords.reduce((sum, keyword) => {
            return sum + (text.includes(keyword) ? 1 : 0);
        }, 0);
        if (score > bestScore) {
            bestScore = score;
            bestCategory = rule.category;
        }
    }

    if (bestScore > 0) return bestCategory;
    return job.category ?? "Engineering";
}

function normalizeJob(raw: any): Job {
    const base = {
        ...raw,
        id: raw.id,
        type: raw.type as any,
        source: raw.source as any,
        salary: raw.salary ?? undefined,
        experience: (raw.experience as any) ?? "Mid-level",
        postedAt: raw.postedAt instanceof Date ? raw.postedAt.toISOString() : raw.postedAt,
        deadline: raw.deadline instanceof Date ? raw.deadline?.toISOString() : raw.deadline,
    };

    return {
        ...base,
        category: inferCategory({
            title: raw.title,
            description: raw.description,
            skills: raw.skills,
            category: raw.category,
        }),
    } as Job;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const getAllJobs = cache(async (): Promise<Job[]> => {
    try {
        const jobs = await prisma.job.findMany({
            where: { isActive: true },
            orderBy: { postedAt: "desc" },
        });

        return jobs.map((j: any) =>
            normalizeJob({
                ...j,
                postedAt: j.postedAt.toISOString(),
                deadline: j.deadline?.toISOString(),
            })
        );
    } catch (e) {
        console.warn("Prisma failed in getAllJobs", e);
        return [];
    }
});

export const getJobById = cache(async (id: string): Promise<Job | undefined> => {
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

// Resume and match data are user-mutated frequently, so avoid cross-request memoization
// in production or the UI can stay stale immediately after uploads/deletes.
export const getAllResumes = noCache(async (): Promise<Resume[]> => {
    let allResumes: Resume[] = [];
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
        allResumes = resumes.map(mapPrismaResume);
    } catch (e) {
        console.warn("Prisma failed in getAllResumes", e);
    }
    
    try {
        const jsonResumes = loadJson<Resume[]>("resumes");
        // Merge without duplicates
        const prismaIds = new Set(allResumes.map(r => r.id));
        const merged = [
            ...allResumes,
            ...jsonResumes.filter(r => !prismaIds.has(r.id))
        ];
        // Sort by uploadedAt desc
        return merged.sort((a, b) => 
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
    } catch (e) {
        console.warn("JSON load failed in getAllResumes", e);
        return allResumes;
    }
});

export const getResumeById = noCache(async (id: string): Promise<Resume | undefined> => {
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

export const getResumesByUserId = noCache(async (userId: string): Promise<Resume[]> => {
    let allResumes: Resume[] = [];
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
        allResumes = resumes.map(mapPrismaResume);
    } catch (e) {
        console.warn("Prisma failed in getResumesByUserId", e);
    }
    
    try {
        const jsonResumes = loadJson<Resume[]>("resumes").filter((r: any) => r.userId === userId);
        const prismaIds = new Set(allResumes.map(r => r.id));
        const merged = [
            ...allResumes,
            ...jsonResumes.filter((r: any) => !prismaIds.has(r.id))
        ];
        return merged.sort((a, b) => 
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
    } catch (e) {
        return allResumes;
    }
});

// ─── Matches ──────────────────────────────────────────────────────────────────

export const getMatchesByResumeId = noCache(async (resumeId: string): Promise<MatchResult | undefined> => {
    try {
        const matches = await prisma.match.findMany({
            where: { resumeId },
            include: { job: true },
            orderBy: { rank: "asc" },
            take: 5,
        });
        if (matches.length > 0) {
            return {
                resumeId,
                candidateName: "User",
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
