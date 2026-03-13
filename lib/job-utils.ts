import type { Job, JobSource as PrismaJobSource, JobType as PrismaJobType } from "@prisma/client";

const jobTypeMap: Record<string, PrismaJobType> = {
    FULL_TIME: "FULL_TIME",
    "Full-time": "FULL_TIME",
    PART_TIME: "PART_TIME",
    "Part-time": "PART_TIME",
    CONTRACT: "CONTRACT",
    Contract: "CONTRACT",
    REMOTE: "REMOTE",
    Remote: "REMOTE",
    RESEARCH: "RESEARCH",
    "Research Contract": "RESEARCH",
};

const jobSourceMap: Record<string, PrismaJobSource> = {
    AFRIWORK: "AFRIWORK",
    Afriwork: "AFRIWORK",
    ETHIOJOBS: "ETHIOJOBS",
    Ethiojobs: "ETHIOJOBS",
    SHEGA: "SHEGA",
    "Shega Insights": "SHEGA",
    HUGGINGFACE: "HUGGINGFACE",
    "Hugging Face": "HUGGINGFACE",
    INTERNAL: "INTERNAL",
    Internal: "INTERNAL",
};

const uiJobTypeMap: Record<PrismaJobType, string> = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    CONTRACT: "Contract",
    REMOTE: "Remote",
    RESEARCH: "Research Contract",
};

const uiJobSourceMap: Record<PrismaJobSource, string> = {
    AFRIWORK: "Afriwork",
    ETHIOJOBS: "Ethiojobs",
    SHEGA: "Shega Insights",
    HUGGINGFACE: "Hugging Face",
    INTERNAL: "Internal",
};

export function parseJobType(value: unknown): PrismaJobType {
    if (typeof value === "string" && value in jobTypeMap) {
        return jobTypeMap[value];
    }

    return "FULL_TIME";
}

export function parseJobSource(value: unknown): PrismaJobSource {
    if (typeof value === "string" && value in jobSourceMap) {
        return jobSourceMap[value];
    }

    return "INTERNAL";
}

export function serializeJob(job: Job) {
    return {
        ...job,
        type: uiJobTypeMap[job.type],
        source: uiJobSourceMap[job.source],
        salary: job.salary ?? undefined,
        category: job.category ?? "Engineering",
        experience: job.experience ?? "Mid-level",
        postedAt: job.postedAt.toISOString(),
        deadline: job.deadline?.toISOString(),
    };
}
