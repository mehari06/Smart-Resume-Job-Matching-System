import { NextResponse } from "next/server";
import prisma from "../prisma";
import { getAllJobs, getMatchesByResumeId, getResumeById } from "../data";
import { buildRankedMatches } from "../match-ranking";
import { assertAllowedExternalResumeUrl } from "../validation";
import { buildResumeText } from "./resume-text";

const MATCH_CACHE_TTL_MS = 15 * 60 * 1000;
const ML_REQUEST_TIMEOUT_MS = 12000;

export type ApplyJobPayload = {
    applicantName?: string;
    email?: string;
    resumeURL?: string;
    resumeId?: string;
    submit: boolean;
};

export type ApplyJobUser = {
    id: string;
    name?: string | null;
    email?: string | null;
};

type ApplicantContext = {
    applicantName: string;
    email: string;
    resumeURL?: string;
    resumeId?: string;
};

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function isFreshComputedAt(value?: string | Date | null) {
    if (!value) return false;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    return Date.now() - parsed.getTime() <= MATCH_CACHE_TTL_MS;
}

function buildApplicantIdentity(user: ApplyJobUser, payload: ApplyJobPayload) {
    const applicantName =
        user.name?.trim() || payload.applicantName?.trim() || "Applicant";
    const email = user.email?.trim()
        ? normalizeEmail(user.email)
        : payload.email?.trim()
          ? normalizeEmail(payload.email)
          : "";

    return { applicantName, email };
}

async function getOwnedResumeDetails(params: {
    resumeId: string;
    userId: string;
    fallbackName: string;
    fallbackEmail: string;
}) {
    const resume = await prisma.resume.findUnique({
        where: { id: params.resumeId },
        include: { user: true },
    });

    if (!resume) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Resume not found" }, { status: 404 }),
        };
    }

    if (resume.userId !== params.userId) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        };
    }

    return {
        ok: true as const,
        applicantName: resume.user.name?.trim() || params.fallbackName,
        email: resume.user.email?.trim()
            ? normalizeEmail(resume.user.email)
            : params.fallbackEmail,
        // Store the canonical asset URL so recruiter access can re-sign it server-side later.
        resumeURL: resume.fileUrl,
    };
}

async function notifyRecruiter(
    job: { postedById: string | null; title: string },
    params: {
        applicationId: string;
        applicantName: string;
        applicantEmail: string;
    }
) {
    if (!job.postedById) return;

    try {
        const { jobEventBus } = await import("../event-bus");
        jobEventBus.notify(job.postedById, {
            type: "new_application",
            application: {
                id: params.applicationId,
                jobTitle: job.title,
                applicantName: params.applicantName,
                applicantEmail: params.applicantEmail,
                createdAt: new Date(),
            },
        });
    } catch (error) {
        console.error("[job-apply] Failed to notify recruiter:", error);
    }
}

async function createApplication(params: {
    jobId: string;
    userId: string;
    applicantName: string;
    email: string;
    resumeURL: string;
}) {
    return prisma.application.create({
        data: {
            jobId: params.jobId,
            userId: params.userId,
            applicantName: params.applicantName,
            email: params.email,
            resumeURL: params.resumeURL,
        },
    });
}

function buildDirectApplicationResponse(job: {
    id: string;
    title: string;
    company: string;
}) {
    return NextResponse.json({
        data: {
            submitted: true,
            targetJob: {
                jobId: job.id,
                jobTitle: job.title,
                company: job.company,
                similarityScore: 0,
                rank: 0,
                isTopMatch: false,
                missingSkills: [],
            },
            recommendations: [],
            algorithm: "Direct application",
        },
        message: "Application submitted successfully",
    });
}

function buildRecommendations(matches: Array<{
    jobId?: string;
    jobTitle: string;
    company: string;
    similarityScore: number;
}>) {
    return matches.slice(0, 5).map((match) => ({
        jobId: match.jobId,
        jobTitle: match.jobTitle,
        company: match.company,
        similarityScore: match.similarityScore,
    }));
}

function normalize(value: string | null | undefined) {
    return (value ?? "").trim().toLowerCase();
}

function computeMatchedAndMissingSkills(jobSkills: string[] = [], resumeSkills: string[] = [], resumeText = "") {
    const normalizedResumeSkills = new Set(resumeSkills.map((skill) => normalize(skill)));
    const normalizedResumeText = normalize(resumeText);

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const rawSkill of jobSkills) {
        const skill = rawSkill.trim();
        if (!skill) continue;
        const normalizedSkill = normalize(skill);

        if (normalizedResumeSkills.has(normalizedSkill) || normalizedResumeText.includes(normalizedSkill)) {
            matchedSkills.push(skill);
        } else {
            missingSkills.push(skill);
        }
    }

    return {
        matchedSkills,
        missingSkills: missingSkills.slice(0, 8),
    };
}

function computeSpecificJobFitEstimate(params: {
    job: { title: string; category?: string | null; skills?: string[]; description?: string | null; company: string; id: string };
    resumeText: string;
    resumeSkills: string[];
}) {
    const { matchedSkills, missingSkills } = computeMatchedAndMissingSkills(
        params.job.skills ?? [],
        params.resumeSkills,
        params.resumeText
    );

    const titleTokens = normalize(params.job.title)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4);
    const descriptionTokens = normalize(params.job.description)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 6)
        .slice(0, 18);
    const resumeText = normalize(params.resumeText);

    const titleMatches = titleTokens.filter((token) => resumeText.includes(token)).length;
    const descriptionMatches = descriptionTokens.filter((token) => resumeText.includes(token)).length;

    const skillCoverage =
        (matchedSkills.length / Math.max((params.job.skills ?? []).length, 1)) * 100;
    const titleCoverage = titleTokens.length > 0 ? (titleMatches / titleTokens.length) * 100 : 0;
    const descriptionCoverage =
        descriptionTokens.length > 0 ? (descriptionMatches / descriptionTokens.length) * 100 : 0;

    const estimatedScore = Math.max(
        12,
        Math.min(
            96,
            Math.round(skillCoverage * 0.55 + titleCoverage * 0.3 + descriptionCoverage * 0.15)
        )
    );

    return {
        jobId: params.job.id,
        jobTitle: params.job.title,
        company: params.job.company,
        similarityScore: estimatedScore,
        rank: 0,
        matchedSkills,
        missingSkills,
        explanation: "Specific-job fit estimate based on your resume content and this job's requirements.",
    };
}

function buildTargetMatch(params: {
    job: { id: string; title: string; company: string; category?: string | null; skills?: string[]; description?: string | null };
    jobId: string;
    rankedMatches: any[];
    resumeText: string;
    resumeSkills: string[];
}) {
    const match = params.rankedMatches.find((item) => item.jobId === params.jobId);
    if (match) return match;

    const titleMatchedRecommendation = params.rankedMatches.find(
        (item) => normalize(item.jobTitle) === normalize(params.job.title)
    );
    if (titleMatchedRecommendation) {
        return {
            ...titleMatchedRecommendation,
            jobId: params.job.id,
            company: params.job.company,
            explanation: `${titleMatchedRecommendation.explanation} (matched to this specific job by title)`,
        };
    }

    return computeSpecificJobFitEstimate({
        job: params.job,
        resumeText: params.resumeText,
        resumeSkills: params.resumeSkills,
    });
}

function getSafeTargetMatch(params: {
    jobId: string;
    jobTitle: string;
    company: string;
    match: any | undefined;
}) {
    if (params.match) return params.match;

    return {
        jobId: params.jobId,
        jobTitle: params.jobTitle,
        company: params.company,
        similarityScore: 0,
        rank: 0,
        matchedSkills: [],
        missingSkills: [],
        explanation: "No score available",
    };
}

async function resolveApplicantContext(params: {
    user: ApplyJobUser;
    payload: ApplyJobPayload;
}): Promise<
    | { ok: true; context: ApplicantContext }
    | { ok: false; response: NextResponse }
> {
    const { applicantName, email } = buildApplicantIdentity(params.user, params.payload);

    if (!params.payload.resumeId) {
        return {
            ok: true,
            context: {
                applicantName,
                email,
                resumeURL: params.payload.resumeURL,
            },
        };
    }

    const ownedResume = await getOwnedResumeDetails({
        resumeId: params.payload.resumeId,
        userId: params.user.id,
        fallbackName: applicantName,
        fallbackEmail: email,
    });

    if (!ownedResume.ok) {
        return { ok: false as const, response: ownedResume.response };
    }

    return {
        ok: true,
        context: {
            applicantName: ownedResume.applicantName,
            email: ownedResume.email,
            resumeURL: ownedResume.resumeURL,
            resumeId: params.payload.resumeId,
        },
    };
}

function validateApplicantContext(context: ApplicantContext, payload: ApplyJobPayload) {
    if (!context.applicantName || !context.email) {
        return NextResponse.json(
            {
                error:
                    "Your account profile is incomplete. Please update your name and email before applying.",
            },
            { status: 400 }
        );
    }

    if (!context.resumeId && !payload.submit) {
        return NextResponse.json(
            { error: "Resume selection is required to calculate a score." },
            { status: 400 }
        );
    }

    if (!context.resumeId) {
        if (!context.resumeURL || !assertAllowedExternalResumeUrl(context.resumeURL)) {
            return NextResponse.json(
                { error: "Provide a valid HTTPS PDF or DOCX resume URL." },
                { status: 400 }
            );
        }
    }

    return null;
}

async function getJobOr404(jobId: string) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Job not found." }, { status: 404 }),
        };
    }

    return { ok: true as const, job };
}

async function handleDirectApplication(params: {
    job: { id: string; postedById: string | null; title: string; company: string };
    userId: string;
    applicantName: string;
    email: string;
    resumeURL: string;
}) {
    try {
        const application = await createApplication({
            jobId: params.job.id,
            userId: params.userId,
            applicantName: params.applicantName,
            email: params.email,
            resumeURL: params.resumeURL,
        });

        await notifyRecruiter(params.job, {
            applicationId: application.id,
            applicantName: params.applicantName,
            applicantEmail: params.email,
        });

        return buildDirectApplicationResponse({
            id: params.job.id,
            title: params.job.title,
            company: params.job.company,
        });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json(
                { error: "You have already applied for this job." },
                { status: 400 }
            );
        }

        throw error;
    }
}

async function computeMatchesForResume(params: { resumeId: string; userId: string }) {
    const resume = await getResumeById(params.resumeId);
    if (!resume || resume.userId !== params.userId) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Resume not found" }, { status: 404 }),
        };
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL?.replace(/\/+$/, "");
    if (!mlServiceUrl) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "ML service not configured" }, { status: 503 }),
        };
    }

    const mlServiceApiKey = process.env.ML_SERVICE_API_KEY ?? process.env.FASTAPI_API_KEY;
    const resumeText = buildResumeText(resume);
    const cachedResult = await getMatchesByResumeId(params.resumeId);
    if (cachedResult?.matches?.length && isFreshComputedAt(cachedResult.computedAt)) {
        return {
            ok: true as const,
            resume,
            resumeText,
            rankedMatches: cachedResult.matches.map((match) => ({
                jobId: match.jobId,
                jobTitle: match.jobTitle,
                company: match.company,
                similarityScore: match.similarityScore,
                rank: match.rank,
                matchedSkills: match.matchedSkills,
                missingSkills: match.missingSkills,
                explanation: match.explanation ?? "Cached ML match",
            })),
        };
    }

    const jobs = await getAllJobs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ML_REQUEST_TIMEOUT_MS);

    let mlServiceResponse: Response;
    try {
        mlServiceResponse = await fetch(`${mlServiceUrl}/match`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                ...(mlServiceApiKey ? { "x-api-key": mlServiceApiKey } : {}),
            },
            body: JSON.stringify({ resume_text: resumeText }),
            cache: "no-store",
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }

    if (!mlServiceResponse.ok) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "ML service failed to respond" }, { status: 502 }),
        };
    }

    const rawMatches = await mlServiceResponse.json();
    const rankedMatches = buildRankedMatches({
        raw: rawMatches,
        jobs,
        resumeText,
        resumeSkills: resume.skills || [],
        threshold: 0,
        minFallback: 5,
    });

    return { ok: true as const, resume, resumeText, rankedMatches };
}

async function submitApplicationIfRequested(params: {
    submit: boolean;
    job: { postedById: string | null; title: string };
    jobId: string;
    userId: string;
    applicantName: string;
    email: string;
    resumeURL: string;
}) {
    if (!params.submit) {
        return { ok: true as const, submitted: false };
    }

    try {
        const application = await createApplication({
            jobId: params.jobId,
            userId: params.userId,
            applicantName: params.applicantName,
            email: params.email,
            resumeURL: params.resumeURL,
        });

        await notifyRecruiter(params.job, {
            applicationId: application.id,
            applicantName: params.applicantName,
            applicantEmail: params.email,
        });

        return { ok: true as const, submitted: true };
    } catch (error: any) {
        if (error?.code === "P2002") {
            return {
                ok: false as const,
                response: NextResponse.json({ error: "You have already applied for this job." }, { status: 400 }),
            };
        }

        throw error;
    }
}

export async function applyToJob(params: {
    jobId: string;
    user: ApplyJobUser;
    payload: ApplyJobPayload;
}) {
    const applicantResult = await resolveApplicantContext({
        user: params.user,
        payload: params.payload,
    });
    if (applicantResult.ok === false) return applicantResult.response;

    const validationError = validateApplicantContext(applicantResult.context, params.payload);
    if (validationError) return validationError;

    const jobResult = await getJobOr404(params.jobId);
    if (jobResult.ok === false) return jobResult.response;

    if (!applicantResult.context.resumeId && params.payload.submit) {
        return handleDirectApplication({
            job: jobResult.job,
            userId: params.user.id,
            applicantName: applicantResult.context.applicantName,
            email: applicantResult.context.email,
            resumeURL: applicantResult.context.resumeURL as string,
        });
    }

    const matchResult = await computeMatchesForResume({
        resumeId: applicantResult.context.resumeId as string,
        userId: params.user.id,
    });
    if (matchResult.ok === false) return matchResult.response;

    const rawTargetMatch = buildTargetMatch({
        job: jobResult.job,
        jobId: params.jobId,
        rankedMatches: matchResult.rankedMatches,
        resumeText: matchResult.resumeText,
        resumeSkills: matchResult.resume.skills || [],
    });

    const targetJobMatch = getSafeTargetMatch({
        jobId: params.jobId,
        jobTitle: jobResult.job.title,
        company: jobResult.job.company,
        match: rawTargetMatch,
    });

    const submissionResult = await submitApplicationIfRequested({
        submit: params.payload.submit,
        job: jobResult.job,
        jobId: params.jobId,
        userId: params.user.id,
        applicantName: applicantResult.context.applicantName,
        email: applicantResult.context.email,
        resumeURL: applicantResult.context.resumeURL as string,
    });
    if (submissionResult.ok === false) return submissionResult.response;

    const isTopMatch = matchResult.rankedMatches[0]?.jobId === params.jobId;

    return NextResponse.json({
        data: {
            submitted: submissionResult.submitted,
            targetJob: {
                ...targetJobMatch,
                isTopMatch,
            },
            recommendations: buildRecommendations(matchResult.rankedMatches),
            algorithm: "SentenceTransformer + Semantic Heuristics",
        },
        message: params.payload.submit
            ? "Application submitted successfully"
            : "Score calculated",
    });
}
