import path from "node:path";
import { z } from "zod";

export const MAX_RESUME_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_RESUME_EXTENSIONS = new Set([".pdf", ".docx"]);
export const ALLOWED_RESUME_MIME_TYPES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const nameSchema = z
    .string()
    .trim()
    .min(1)
    .max(120);

const emailSchema = z.string().email().max(254);
const httpsUrlSchema = z.string().url().max(2000).refine((value) => value.startsWith("https://"), {
    message: "URL must use HTTPS",
});

const targetRoleSchema = z
    .string()
    .trim()
    .min(2)
    .max(120)
    .optional();

export const profileUpdateSchema = z.object({
    name: nameSchema,
    firstName: z.string().trim().max(60).optional(),
    lastName: z.string().trim().max(60).optional(),
    city: z.string().trim().max(120).optional(),
    age: z.number().int().min(13).max(100).optional(),
    education: z.string().trim().max(160).optional(),
    fieldOfStudy: z.string().trim().max(160).optional(),
    isStudent: z.boolean().optional(),
});

export const jobCreateSchema = z.object({
    title: z.string().trim().min(3).max(160),
    company: z.string().trim().min(2).max(160),
    description: z.string().trim().min(30).max(20000),
    location: z.string().trim().max(160).optional(),
    type: z.unknown().optional(),
    salary: z.string().trim().max(120).optional().nullable(),
    skills: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
    source: z.unknown().optional(),
    category: z.string().trim().max(120).optional(),
    experience: z.string().trim().max(120).optional(),
    deadline: z.string().trim().optional().nullable(),
});

export const jobUpdateSchema = jobCreateSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    { message: "At least one field is required" }
);

export const resumePatchSchema = z.object({
    skills: z.array(z.string().trim().min(1).max(60)).max(100).optional(),
    targetRole: targetRoleSchema,
}).refine((value) => (value.skills?.length ?? 0) > 0 || !!value.targetRole, {
    message: "Provide at least one skill or targetRole",
});

export const recruiterSearchSchema = z.object({
    jobDescription: z.string().trim().min(20).max(20000),
    minScore: z.number().min(0).max(100).optional(),
});

export const applyJobSchema = z.object({
    applicantName: nameSchema.optional(),
    email: emailSchema.optional(),
    resumeURL: httpsUrlSchema.optional(),
    resumeId: z.string().trim().min(1).max(100).optional(),
    submit: z.boolean().optional(),
});

export const resumeMetadataSchema = z.object({
    fileName: z.string().trim().min(1).max(255),
    fileUrl: httpsUrlSchema,
    filePublicId: z.string().trim().min(1).max(255),
    targetRole: z.string().trim().max(120).optional(),
    skills: z.array(z.string().trim().min(1).max(60)).max(100).optional(),
    experienceYears: z.number().int().min(0).max(80).optional(),
});

export function sanitizeDisplayFileName(fileName: string) {
    const base = path.basename(fileName).replace(/[^a-zA-Z0-9._ -]/g, "_").trim();
    return base.slice(0, 120) || "resume";
}

export function getFileExtension(fileName: string) {
    return path.extname(fileName).toLowerCase();
}

export function assertAllowedResumeFileName(fileName: string) {
    const extension = getFileExtension(fileName);
    return ALLOWED_RESUME_EXTENSIONS.has(extension);
}

export function assertAllowedResumeMimeType(mimeType: string | null | undefined) {
    return !!mimeType && ALLOWED_RESUME_MIME_TYPES.has(mimeType);
}

export function assertAllowedExternalResumeUrl(url: string) {
    try {
        const parsed = new URL(url);
        const extension = getFileExtension(parsed.pathname);
        return parsed.protocol === "https:" && ALLOWED_RESUME_EXTENSIONS.has(extension);
    } catch {
        return false;
    }
}

export function validateResumeMagicBytes(fileName: string, buffer: Buffer) {
    const extension = getFileExtension(fileName);
    if (extension === ".pdf") {
        return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
    }

    if (extension === ".docx") {
        return (
            buffer.length >= 4 &&
            buffer[0] === 0x50 &&
            buffer[1] === 0x4b &&
            buffer[2] === 0x03 &&
            buffer[3] === 0x04
        );
    }

    return false;
}

export function parseJsonArrayOfStrings(input: unknown) {
    if (!Array.isArray(input)) return [];
    return input
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean);
}
