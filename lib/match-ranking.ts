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

function normalize(text: string): string {
    return text.toLowerCase().trim();
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

export function buildRankedMatches(options: BuildOptions): RankedMatch[] {
    const { raw, jobs, resumeText, resumeSkills, threshold, minFallback } = options;

    // The user explicitly requested STRICT ML scores only.
    // Iterating exclusively over the 5 raw results returned by the Python Hugging Face service.
    const scored = raw
        .map((item) => {
            // Attempt to find the job in our database to hook up the ID, but do not override the ML title
            const job = jobs.find((j) => normalize(j.title) === normalize(item.job_title ?? ""));

            // Strict ML Scoring. No Next.js heuristics, overlaps, or affinities added!
            const pureMLScore = toPercent(item.score);

            return {
                jobId: job?.id,
                jobTitle: job?.title ?? item.job_title ?? "Unknown role",
                company: job?.company ?? "Unknown company",
                similarityScore: pureMLScore, 
                _rankingScore: pureMLScore, 
                rank: 0,
                matchedSkills: (job?.skills ?? []).filter((skill) =>
                    resumeSkills.some((rs) => normalize(rs) === normalize(skill))
                ),
                missingSkills: computeMissingSkills(job?.skills ?? [], resumeSkills),
                explanation: "Pure ML Algorithm Match",
            } as RankedMatch & { _rankingScore: number };
        })
        .sort((a, b) => b._rankingScore - a._rankingScore)
        .map(item => {
            const { _rankingScore, ...rest } = item;
            return rest as RankedMatch;
        });

    const thresholded = scored.filter((m) => m.similarityScore >= threshold);
    const fallbackCount = Math.max(3, minFallback);
    const selected = thresholded.length > 0 ? thresholded : scored.slice(0, fallbackCount);

    const seen = new Set<string>();
    const unique = selected.filter((m) => {
        const key = `${m.jobId ?? ""}:${m.jobTitle}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return unique.map((m, idx) => ({
        ...m,
        rank: idx + 1,
        explanation:
            thresholded.length > 0
                ? m.explanation
                : "Semantic ML match (low-confidence fallback; below threshold)",
    }));
}
