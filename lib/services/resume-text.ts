type ResumeTextSource = {
    candidateName?: unknown;
    targetRole?: unknown;
    summary?: unknown;
    parsedText?: unknown;
    skills?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

export function buildResumeText(resume: ResumeTextSource): string {
    const parts: string[] = [];

    if (isNonEmptyString(resume.candidateName)) parts.push(resume.candidateName);
    if (isNonEmptyString(resume.targetRole)) parts.push(resume.targetRole);
    if (isNonEmptyString(resume.summary)) parts.push(resume.summary);
    if (isNonEmptyString(resume.parsedText)) parts.push(resume.parsedText);

    if (Array.isArray(resume.skills)) {
        const skills = resume.skills.filter(isNonEmptyString);
        if (skills.length > 0) parts.push(skills.join(" "));
    }

    return parts.join("\n").trim();
}

