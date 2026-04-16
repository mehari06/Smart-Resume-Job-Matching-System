import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import prisma from "../prisma";
import { cloudinary, getSignedResumeAssetUrl, isOwnedResumePublicId } from "../cloudinary";
import { getAllJobs } from "../data";
import {
    MAX_RESUME_FILE_SIZE_BYTES,
    assertAllowedResumeFileName,
    assertAllowedResumeMimeType,
    parseJsonArrayOfStrings,
    resumeMetadataSchema,
    sanitizeDisplayFileName,
    validateResumeMagicBytes,
} from "../validation";

type ResumeUploadForm = {
    fileName: string;
    fileUrl: string;
    filePublicId: string;
    targetRole?: string;
    skills?: string[];
    experienceYears?: number;
};

type ParsedUpload = {
    fileBuffer: Buffer;
    fileMimeType?: string;
    form: ResumeUploadForm;
};

type UploadResult = {
    response: NextResponse;
};

type ResumeOwner = {
    id: string;
    name?: string | null;
    email?: string | null;
};

function canUseJsonFallback() {
    return process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1";
}

function safeParseStringArray(value: FormDataEntryValue | null) {
    if (typeof value !== "string" || !value.trim()) return undefined;

    try {
        return parseJsonArrayOfStrings(JSON.parse(value));
    } catch {
        return undefined;
    }
}

function sanitizeTargetRole(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const normalized = sanitizeTextForDatabase(value).trim();
    if (!normalized) return undefined;
    if (/^analyzing\.{0,3}$/i.test(normalized)) return undefined;
    if (/^unknown$/i.test(normalized)) return undefined;
    return normalized;
}

function sanitizeTextForDatabase(value: string) {
    return value
        .replace(/\u0000/g, "")
        .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ");
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildKnownSkillCatalog(allJobs: Array<{ skills?: string[] }>) {
    const fromJobs = new Set<string>();

    for (const job of allJobs) {
        for (const skill of job.skills ?? []) {
            if (typeof skill === "string" && skill.trim()) {
                fromJobs.add(skill.trim());
            }
        }
    }

    const curated = [
        "Next.js",
        "Express.js",
        "Express",
        "PostgreSQL",
        "Postgres",
        "Node.js",
        "React",
        "TypeScript",
        "JavaScript",
    ];

    for (const skill of curated) fromJobs.add(skill);
    return Array.from(fromJobs.values());
}

function extractSkillsFromText(params: { text: string; knownSkills: string[] }) {
    const normalized = params.text.toLowerCase();
    const found = new Set<string>();

    const synonymRules: Array<{ skill: string; regex: RegExp }> = [
        { skill: "Next.js", regex: /\bnext(\.js)?\b/i },
        { skill: "Express.js", regex: /\bexpress(\.js)?\b/i },
        { skill: "Node.js", regex: /\bnode(\.js)?\b/i },
        { skill: "PostgreSQL", regex: /\bpostgres(ql)?\b/i },
    ];

    for (const rule of synonymRules) {
        if (rule.regex.test(params.text)) found.add(rule.skill);
    }

    for (const skill of params.knownSkills) {
        const trimmed = skill.trim();
        if (!trimmed) continue;

        const lower = trimmed.toLowerCase();
        if (lower.length < 3) continue;

        if (normalized.includes(lower)) {
            found.add(trimmed);
            continue;
        }

        const safe = escapeRegExp(lower);
        const regex = new RegExp(`\\b${safe}\\b`, "i");
        if (regex.test(params.text)) found.add(trimmed);
    }

    return Array.from(found.values()).sort((a, b) => a.localeCompare(b));
}

async function downloadAsBuffer(url: string) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

async function extractTextFromBuffer(fileName: string, buffer: Buffer) {
    const extension = path.extname(fileName).toLowerCase();

    if (extension === ".pdf") {
        const mod = await import("pdf-parse");
        const pdfParse = (mod as any).default ?? mod;
        const result = await pdfParse(buffer);
        return { text: sanitizeTextForDatabase(String(result.text ?? "")), parser: "pdf-parse" as const };
    }

    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: sanitizeTextForDatabase(String(result.value ?? "")), parser: "mammoth" as const };
}

async function extractTextFromResume(params: {
    fileName: string;
    fileUrl: string;
    filePublicId: string;
    fileBuffer?: Buffer;
}) {
    const extension = path.extname(params.fileName).toLowerCase();
    if (extension !== ".pdf" && extension !== ".docx") {
        return { text: "", parser: "none" as const, supported: false as const };
    }

    let buffer = params.fileBuffer;

    if (!buffer) {
        const signedUrl = cloudinary.url(params.filePublicId, {
            resource_type: "raw",
            type: "authenticated",
            sign_url: true,
            secure: true,
        });
        buffer = await downloadAsBuffer(signedUrl);
    }

    const parsed = await extractTextFromBuffer(params.fileName, buffer);
    return { text: parsed.text, parser: parsed.parser, supported: true as const };
}

function validateCloudinaryUrl(fileUrl: string) {
    try {
        const parsed = new URL(fileUrl);
        if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

async function parseUploadForm(request: NextRequest): Promise<ParsedUpload | NextResponse> {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
        return NextResponse.json(
            { error: "A PDF or DOCX file upload is required" },
            { status: 400 }
        );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json(
            { error: "A PDF or DOCX file upload is required" },
            { status: 400 }
        );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileMimeType = file.type;

    const form: ResumeUploadForm = {
        fileName: String(formData.get("fileName") ?? ""),
        fileUrl: String(formData.get("fileUrl") ?? ""),
        filePublicId: String(formData.get("filePublicId") ?? ""),
        targetRole: sanitizeTargetRole(formData.get("targetRole")),
        skills: safeParseStringArray(formData.get("skills")),
        experienceYears: formData.get("experienceYears")
            ? Number(formData.get("experienceYears"))
            : undefined,
    };

    return { fileBuffer, fileMimeType, form };
}

function validateUploadInput(params: {
    userId: string;
    upload: ParsedUpload;
}): { ok: true; data: ParsedUpload } | { ok: false; response: NextResponse } {
    const parsed = resumeMetadataSchema.safeParse({
        fileName: params.upload.form.fileName,
        fileUrl: params.upload.form.fileUrl,
        filePublicId: params.upload.form.filePublicId,
        targetRole: params.upload.form.targetRole,
        skills: params.upload.form.skills,
        experienceYears:
            typeof params.upload.form.experienceYears === "number" &&
            Number.isFinite(params.upload.form.experienceYears)
                ? params.upload.form.experienceYears
                : undefined,
    });

    if (!parsed.success) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: "Invalid resume upload payload" },
                { status: 400 }
            ),
        };
    }

    const fileName = sanitizeDisplayFileName(parsed.data.fileName);
    const fileUrl = parsed.data.fileUrl;
    const filePublicId = parsed.data.filePublicId;

    if (!assertAllowedResumeFileName(fileName)) {
        return { ok: false, response: NextResponse.json({ error: "Only PDF and DOCX resumes are allowed" }, { status: 400 }) };
    }

    if (!assertAllowedResumeMimeType(params.upload.fileMimeType)) {
        return { ok: false, response: NextResponse.json({ error: "Unsupported resume file type" }, { status: 400 }) };
    }

    if (params.upload.fileBuffer.length > MAX_RESUME_FILE_SIZE_BYTES) {
        return { ok: false, response: NextResponse.json({ error: "Resume file exceeds the 10MB limit" }, { status: 400 }) };
    }

    if (!validateResumeMagicBytes(fileName, params.upload.fileBuffer)) {
        return { ok: false, response: NextResponse.json({ error: "Uploaded file content does not match the allowed file type" }, { status: 400 }) };
    }

    if (!validateCloudinaryUrl(fileUrl)) {
        return { ok: false, response: NextResponse.json({ error: "Invalid resume storage location" }, { status: 400 }) };
    }

    if (!isOwnedResumePublicId(filePublicId, params.userId)) {
        return { ok: false, response: NextResponse.json({ error: "Invalid upload ownership" }, { status: 400 }) };
    }

    return {
        ok: true,
        data: {
            fileBuffer: params.upload.fileBuffer,
            fileMimeType: params.upload.fileMimeType,
            form: {
                ...params.upload.form,
                fileName,
                fileUrl,
                filePublicId,
            },
        },
    };
}

async function maybeExtractSkills(params: {
    fileName: string;
    fileUrl: string;
    filePublicId: string;
    fileBuffer: Buffer;
    existingSkills: string[];
}) {
    if (params.existingSkills.length > 0) {
        return { skills: params.existingSkills, parsedText: undefined as string | undefined, parserUsed: undefined as string | undefined };
    }

    try {
        const allJobs = await getAllJobs();
        const knownSkills = buildKnownSkillCatalog(allJobs as any);
        const extracted = await extractTextFromResume({
            fileName: params.fileName,
            fileUrl: params.fileUrl,
            filePublicId: params.filePublicId,
            fileBuffer: params.fileBuffer,
        });

        const parsedText = sanitizeTextForDatabase(extracted.text).trim().slice(0, 20000);
        const skills = parsedText ? extractSkillsFromText({ text: parsedText, knownSkills }) : [];

        return { skills, parsedText, parserUsed: extracted.parser };
    } catch (error) {
        console.warn("[resume-upload] Failed to extract text/skills", error);
        return { skills: [] as string[], parsedText: undefined, parserUsed: undefined };
    }
}

async function saveResumeJsonFallback(params: {
    user: { id: string; name?: string | null; email?: string | null };
    form: ResumeUploadForm;
    parsedText?: string;
    skills: string[];
}) {
    const jsonResume = {
        id: `resume-${crypto.randomUUID()}`,
        userId: params.user.id,
        candidateName: params.user.name ?? "User",
        email: params.user.email ?? undefined,
        targetRole: params.form.targetRole,
        experienceYears: params.form.experienceYears,
        skills: params.skills,
        summary: params.parsedText ? params.parsedText.slice(0, 2000) : undefined,
        parsedText: params.parsedText,
        fileName: params.form.fileName,
        fileUrl: params.form.fileUrl,
        filePublicId: params.form.filePublicId,
        uploadedAt: new Date().toISOString(),
    };

    const resumesPath = path.join(process.cwd(), "data", "resumes.json");
    const existingRaw = await fs.readFile(resumesPath, "utf8").catch(() => "[]");
    const existing = (JSON.parse(existingRaw) as unknown[]).filter(Boolean);
    const updated = [jsonResume, ...existing];
    await fs.writeFile(resumesPath, JSON.stringify(updated, null, 4), "utf8");

    return jsonResume;
}

async function ensureResumeOwnerUser(user: ResumeOwner): Promise<ResumeOwner> {
    const normalizedEmail = user.email?.trim().toLowerCase();

    const existingById = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true },
    });
    if (existingById) {
        return existingById;
    }

    if (normalizedEmail) {
        const existingByEmail = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, name: true, email: true },
        });

        if (existingByEmail) {
            return existingByEmail;
        }
    }

    return prisma.user.create({
        data: {
            id: user.id,
            name: user.name ?? "User",
            email: normalizedEmail,
        },
        select: { id: true, name: true, email: true },
    });
}

export async function createResumeFromUpload(params: {
    request: NextRequest;
    user: { id: string; name?: string | null; email?: string | null };
}): Promise<UploadResult> {
    const parsedForm = await parseUploadForm(params.request);
    if (parsedForm instanceof NextResponse) {
        return { response: parsedForm };
    }

    const validation = validateUploadInput({ userId: params.user.id, upload: parsedForm });
    if (validation.ok === false) {
        return { response: validation.response };
    }

    const { form, fileBuffer } = validation.data;
    const existingSkills = Array.isArray(form.skills) ? form.skills : [];
    let resumeOwner = params.user;

    const extracted = await maybeExtractSkills({
        fileName: form.fileName,
        fileUrl: form.fileUrl,
        filePublicId: form.filePublicId,
        fileBuffer,
        existingSkills,
    });

    const finalSkills = extracted.skills.length > 0 ? extracted.skills : existingSkills;

    try {
        resumeOwner = await ensureResumeOwnerUser(params.user);

        const newResume = await prisma.resume.create({
            data: {
                userId: resumeOwner.id,
                fileName: form.fileName,
                fileUrl: form.fileUrl,
                filePublicId: form.filePublicId,
                skills: finalSkills,
                targetRole: form.targetRole,
                experienceYears: form.experienceYears,
                parsedText: extracted.parsedText ? sanitizeTextForDatabase(extracted.parsedText).slice(0, 20000) : undefined,
            },
        });

        return {
            response: NextResponse.json(
                {
                    data: {
                        ...newResume,
                        fileUrl: getSignedResumeAssetUrl(newResume.filePublicId, newResume.fileUrl),
                    },
                    message: "Resume uploaded successfully",
                    meta: { parserUsed: extracted.parserUsed },
                },
                { status: 201 }
            ),
        };
    } catch (error) {
        console.error("[resume-upload] Prisma write failed, falling back to JSON store", error);
        if (!canUseJsonFallback()) {
            return {
                response: NextResponse.json(
                    { error: "Failed to save resume to database" },
                    { status: 503 }
                ),
            };
        }
    }

    const jsonResume = await saveResumeJsonFallback({
        user: resumeOwner,
        form,
        parsedText: extracted.parsedText,
        skills: finalSkills,
    });

    return {
        response: NextResponse.json(
            {
                data: {
                    ...jsonResume,
                    fileUrl: getSignedResumeAssetUrl(jsonResume.filePublicId, jsonResume.fileUrl),
                },
                message: "Resume uploaded successfully (JSON fallback)",
                meta: { parserUsed: extracted.parserUsed },
            },
            { status: 201 }
        ),
    };
}
