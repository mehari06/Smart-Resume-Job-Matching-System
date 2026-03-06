/**
 * Data access helpers — reads from JSON files in /data directory.
 * These are the "dummy data" layer. When the ML service and Prisma DB
 * are connected, replace these functions with DB queries.
 */

import type { Job, Resume, MatchResult, JobFilters } from "../types";

function loadJson<T>(filename: string): T {
    // In Next.js API routes, require() works for JSON files
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`../data/${filename}.json`) as T;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export function getAllJobs(): Job[] {
    return loadJson<Job[]>("jobs");
}

export function getJobById(id: string): Job | undefined {
    const jobs = getAllJobs();
    return jobs.find((j) => j.id === id);
}

export function getFilteredJobs(
    filters: JobFilters = {},
    page = 1,
    pageSize = 9
): { jobs: Job[]; total: number; totalPages: number } {
    let jobs = getAllJobs();

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

export function getJobCategories(): string[] {
    const jobs = getAllJobs();
    return Array.from(new Set(jobs.map((j) => j.category).filter(Boolean) as string[])).sort();
}

// ─── Resumes ──────────────────────────────────────────────────────────────────

export function getAllResumes(): Resume[] {
    return loadJson<Resume[]>("resumes");
}

export function getResumeById(id: string): Resume | undefined {
    return getAllResumes().find((r) => r.id === id);
}

export function getResumesByUserId(userId: string): Resume[] {
    return getAllResumes().filter((r) => r.userId === userId);
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export function getMatchesByResumeId(resumeId: string): MatchResult | undefined {
    const allMatches = loadJson<Record<string, MatchResult>>("matches");
    return allMatches[resumeId];
}

// ─── Recruiter search (simulated) ─────────────────────────────────────────────
// When ML is integrated, this calls the Python microservice.
// For now: keyword-based overlap scoring.

export function searchResumesByJobDescription(
    jobDescription: string,
    minScore = 50
): Array<{
    resume: Resume;
    matchScore: number;
    matchedSkills: string[];
}> {
    const resumes = getAllResumes();
    const descWords = jobDescription.toLowerCase().split(/\W+/).filter((w) => w.length > 3);

    return resumes
        .map((resume) => {
            const matchedSkills = resume.skills.filter((skill) =>
                descWords.some((word) => skill.toLowerCase().includes(word))
            );
            const matchScore = Math.min(
                100,
                Math.round((matchedSkills.length / Math.max(resume.skills.length, 1)) * 100 + Math.random() * 10)
            );
            return { resume, matchScore, matchedSkills };
        })
        .filter((r) => r.matchScore >= minScore)
        .sort((a, b) => b.matchScore - a.matchScore);
}
