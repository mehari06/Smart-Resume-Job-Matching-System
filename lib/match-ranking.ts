import type { Job } from "../types";

export type MlMatchItem = {
    job_title?: string;
    score?: number;
    job_idx?: number;
};

export type RankedMatch = {
    jobId?: string;
    jobTitle: string;
    company: string;
    similarityScore: number;
    rank: number;
    matchedSkills: string[];
    missingSkills: string[];
    explanation: string;
};

type BuildOptions = {
    raw: MlMatchItem[];
    jobs: Job[];
    resumeText: string;
    resumeSkills: string[];
    threshold: number;
    minFallback: number;
};

type RankedMatchInternal = RankedMatch & {
    _rankingScore: number;
    _dbBacked: boolean;
};

function normalize(text: string): string {
    return text.toLowerCase().trim();
}

function tokenize(text: string) {
    return normalize(text)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3);
}

function hasAny(text: string, keywords: string[]): boolean {
    const t = normalize(text);
    return keywords.some((k) => t.includes(k));
}

function toPercent(score?: number): number {
    if (typeof score !== "number") return 0;
    const bounded = Math.max(0, Math.min(1, score));
    return Math.round(bounded * 10000) / 100;
}

function computeSkillOverlap(jobSkills: string[] = [], resumeSkills: string[] = [], resumeText = ""): number {
    const resumeSet = new Set(resumeSkills.map((s) => normalize(s)));
    const text = normalize(resumeText);
    let score = 0;
    for (const skill of jobSkills) {
        const s = normalize(skill);
        if (!s) continue;
        if (resumeSet.has(s) || text.includes(s)) score += 1;
    }
    return score;
}

function computeTitleAffinity(jobTitle: string, resumeText: string): number {
    const t = normalize(jobTitle);
    const r = normalize(resumeText);
    let score = 0;
    if (t.includes("data") && hasAny(r, ["data", "pandas", "sql", "analytics", "analysis"])) score += 2;
    if (t.includes("full stack") && hasAny(r, ["full stack", "react", "node", "javascript", "typescript"])) score += 2;
    if (t.includes("frontend") && hasAny(r, ["react", "frontend", "html", "css", "vite"])) score += 2;
    if (t.includes("backend") && hasAny(r, ["backend", "api", "node", "database", "sql"])) score += 2;
    if (t.includes("software") && hasAny(r, ["software", "typescript", "react", "node", "api", "sql"])) score += 2;
    if (t.includes("machine learning") && hasAny(r, ["machine learning", "ml", "ai", "nlp"])) score += 2;
    return score;
}

function computeDomainPenalty(
    jobTitle: string,
    category: string | undefined,
    resumeText: string,
    overlap: number
): number {
    const title = normalize(jobTitle);
    const cat = normalize(category ?? "");
    const r = normalize(resumeText);
    const technicalProfile = hasAny(r, [
        "computer science",
        "software engineering",
        "data science",
        "java",
        "python",
        "react",
        "sql",
        "mongodb",
        "git",
    ]);
    if (!technicalProfile) return 0;
    if (overlap > 0) return 0;

    const contentLike =
        hasAny(title, ["video editor", "tiktok", "content creator", "creative director"]) ||
        hasAny(cat, ["content", "design"]);
    return contentLike ? 18 : 0;
}

function computeMissingSkills(jobSkills: string[] = [], resumeSkills: string[] = []): string[] {
    const resumeSet = new Set(resumeSkills.map((s) => normalize(s)));
    return jobSkills.filter((skill) => !resumeSet.has(normalize(skill))).slice(0, 8);
}

function computeTokenOverlapScore(a: string, b: string) {
    const left = tokenize(a);
    const right = new Set(tokenize(b));
    if (left.length === 0 || right.size === 0) return 0;
    const overlap = left.filter((token) => right.has(token)).length;
    return overlap / Math.max(left.length, 1);
}

function findBestDatabaseJob(title: string, jobs: Job[]) {
    const exact = jobs.find((job) => normalize(job.title) === normalize(title));
    if (exact) return exact;

    let best: Job | undefined;
    let bestScore = 0;

    for (const job of jobs) {
        const score = computeTokenOverlapScore(title, job.title);
        if (score > bestScore) {
            bestScore = score;
            best = job;
        }
    }

    return bestScore >= 0.6 ? best : undefined;
}

function scoreDatabaseJob(job: Job, resumeText: string, resumeSkills: string[]) {
    const overlap = computeSkillOverlap(job.skills ?? [], resumeSkills, resumeText);
    const titleAffinity = computeTitleAffinity(job.title, resumeText);
    const penalty = computeDomainPenalty(job.title, job.category, resumeText, overlap);
    const totalSkills = Math.max(job.skills?.length ?? 0, 1);
    const skillPercent = (overlap / totalSkills) * 100;
    const titlePercent = Math.min(100, titleAffinity * 20);
    const score = Math.max(12, Math.min(95, Math.round(skillPercent * 0.65 + titlePercent * 0.35 - penalty)));

    return {
        score,
        overlap,
        titleAffinity,
        penalty,
    };
}

function buildRawRecommendations(raw: MlMatchItem[], jobs: Job[], resumeText: string, resumeSkills: string[]) {
    return raw.map((item) => {
        const matchedJob = findBestDatabaseJob(item.job_title ?? "", jobs);
        const pureMLScore = toPercent(item.score);
        const overlap = computeSkillOverlap(matchedJob?.skills ?? [], resumeSkills, resumeText);
        const titleAffinity = computeTitleAffinity(matchedJob?.title ?? item.job_title ?? "", resumeText);
        const penalty = computeDomainPenalty(matchedJob?.title ?? item.job_title ?? "", matchedJob?.category, resumeText, overlap);
        const dbBoost = matchedJob ? 10 : 0;
        const rankingScore = pureMLScore + dbBoost + overlap * 4 + titleAffinity * 4 - penalty;

        return {
            jobId: matchedJob?.id,
            jobTitle: matchedJob?.title ?? item.job_title ?? "Unknown role",
            company: matchedJob?.company ?? "Unknown company",
            similarityScore: pureMLScore,
            rank: 0,
            matchedSkills: (matchedJob?.skills ?? []).filter((skill) =>
                resumeSkills.some((rs) => normalize(rs) === normalize(skill))
            ),
            missingSkills: computeMissingSkills(matchedJob?.skills ?? [], resumeSkills),
            explanation: matchedJob
                ? "ML recommendation aligned with a job from your database."
                : "ML recommendation from the external service.",
            _rankingScore: rankingScore,
            _dbBacked: Boolean(matchedJob),
        } as RankedMatchInternal;
    });
}

function buildDatabaseFallbacks(jobs: Job[], resumeText: string, resumeSkills: string[], excludedJobIds: Set<string>) {
    return jobs
        .map((job) => {
            const scored = scoreDatabaseJob(job, resumeText, resumeSkills);
            return {
                jobId: job.id,
                jobTitle: job.title,
                company: job.company,
                similarityScore: scored.score,
                rank: 0,
                matchedSkills: (job.skills ?? []).filter((skill) =>
                    resumeSkills.some((rs) => normalize(rs) === normalize(skill))
                ),
                missingSkills: computeMissingSkills(job.skills ?? [], resumeSkills),
                explanation: "Recommended from jobs in your database using resume-to-job fit scoring.",
                _rankingScore: scored.score + 12,
                _dbBacked: true,
            } as RankedMatchInternal;
        })
        .filter((item) => !excludedJobIds.has(item.jobId ?? "") && item.similarityScore >= 35)
        .sort((a, b) => b._rankingScore - a._rankingScore)
        .slice(0, 6);
}

export function buildRankedMatches(options: BuildOptions): RankedMatch[] {
    const { raw, jobs, resumeText, resumeSkills, threshold, minFallback } = options;

    const rawRecommendations = buildRawRecommendations(raw, jobs, resumeText, resumeSkills);
    const knownJobIds = new Set(rawRecommendations.map((item) => item.jobId).filter(Boolean) as string[]);
    const databaseFallbacks = buildDatabaseFallbacks(jobs, resumeText, resumeSkills, knownJobIds);

    const combined = [...rawRecommendations, ...databaseFallbacks]
        .sort((a, b) => {
            if (a._dbBacked !== b._dbBacked) {
                return a._dbBacked ? -1 : 1;
            }
            return b._rankingScore - a._rankingScore;
        });

    const thresholded = combined.filter((m) => m.similarityScore >= threshold);
    const fallbackCount = Math.max(5, minFallback);
    const selected = thresholded.length > 0 ? thresholded : combined.slice(0, fallbackCount);

    const seen = new Set<string>();
    const unique = selected.filter((m) => {
        const key = `${m.jobId ?? ""}:${m.jobTitle}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return unique.slice(0, 5).map((item, idx) => {
        const { _rankingScore, _dbBacked, ...match } = item;
        return {
            ...match,
            rank: idx + 1,
            explanation:
                thresholded.length > 0
                    ? match.explanation
                    : _dbBacked
                        ? "Top recommendation from jobs in your database based on resume-to-job fit."
                        : "External ML recommendation (lower-confidence fallback).",
        };
    });
}
