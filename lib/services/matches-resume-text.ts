type ResumeLike = {
    candidateName?: unknown;
    targetRole?: unknown;
    summary?: unknown;
    parsedText?: unknown;
    skills?: unknown;
    experience?: unknown;
};

function isPlaceholderText(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return true;
    return /^analyzing\.{0,3}$/i.test(trimmed) || /^unknown$/i.test(trimmed);
}

function addIfMeaningful(parts: string[], value: unknown) {
    if (typeof value !== "string") return;
    if (isPlaceholderText(value)) return;
    parts.push(value);
}

export function buildMatchesResumeText(resume: ResumeLike): string {
    const parts: string[] = [];

    addIfMeaningful(parts, resume.candidateName);
    addIfMeaningful(parts, resume.targetRole);
    addIfMeaningful(parts, resume.summary);
    addIfMeaningful(parts, resume.parsedText);

    if (Array.isArray(resume.skills) && resume.skills.length > 0) {
        parts.push(resume.skills.join(" "));
    }

    if (Array.isArray(resume.experience) && resume.experience.length > 0) {
        parts.push(
            resume.experience
                .map((entry: any) => `${entry?.title ?? ""} ${entry?.company ?? ""}`)
                .join(" ")
        );
    }

    return parts.join("\n").trim();
}

