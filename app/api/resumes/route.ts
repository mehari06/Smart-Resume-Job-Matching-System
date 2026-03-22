import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getAllJobs, getAllResumes } from "../../../lib/data";
import { requireSessionUser, syncSessionUser } from "../../../lib/api-auth";
import prisma from "../../../lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeTargetRole(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim();
    if (!normalized) return undefined;
    if (/^analyzing\.{0,3}$/i.test(normalized)) return undefined;
    if (/^unknown$/i.test(normalized)) return undefined;
    return normalized;
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function downloadAsBuffer(url: string) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(`Failed to download file: ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function extractTextFromResumeFile(params: { fileUrl: string; fileName: string; filePublicId?: string; fileBuffer?: Buffer }) {
    const ext = path.extname(params.fileName).toLowerCase();

    if (ext !== ".pdf" && ext !== ".docx") {
        return { text: "", parser: "none" as const, supported: false as const };
    }

    let buffer: Buffer;
    
    if (params.fileBuffer) {
        console.log(`[extractTextFromResumeFile] Using provided local file buffer for ${params.fileName}`);
        buffer = params.fileBuffer;
    } else if (params.filePublicId) {
        try {
            // Fallback to Cloudinary SDK download if no buffer provided (e.g. legacy/re-parse)
            const resourceType = "raw";
            const signedUrl = cloudinary.url(params.filePublicId, {
                resource_type: resourceType,
                sign_url: true,
                secure: true
            });
            console.log(`[extractTextFromResumeFile] No buffer, using signed URL for ${params.filePublicId}`);
            buffer = await downloadAsBuffer(signedUrl);
        } catch (e) {
            console.error(`[extractTextFromResumeFile] Signed download failed, trying public URL`, e);
            buffer = await downloadAsBuffer(params.fileUrl);
        }
    } else {
        buffer = await downloadAsBuffer(params.fileUrl);
    }

    if (ext === ".pdf") {
        const mod = await import("pdf-parse");
        const pdfParse = (mod as any).default ?? mod;
        const result = await pdfParse(buffer);
        return { text: String(result.text ?? ""), parser: "pdf-parse" as const, supported: true as const };
    }

    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: String(result.value ?? ""), parser: "mammoth" as const, supported: true as const };
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
        const s = skill.trim();
        if (!s) continue;
        const lower = s.toLowerCase();
        if (lower.length < 3) continue;

        if (normalized.includes(lower)) {
            found.add(s);
            continue;
        }

        const safe = escapeRegExp(lower);
        const re = new RegExp(`\\b${safe}\\b`, "i");
        if (re.test(params.text)) found.add(s);
    }

    return Array.from(found.values()).sort((a, b) => a.localeCompare(b));
}

/**
 * GET /api/resumes   - Returns resumes for the authenticated user
 * POST /api/resumes  - Creates a resume record (upload handled client-side via Cloudinary)
 */

export async function GET(request: NextRequest) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const { searchParams } = new URL(request.url);
        const requestedUserId = searchParams.get("userId");

        const resumes = await getAllResumes();
        const targetUserId =
            auth.user.role === "ADMIN" && requestedUserId ? requestedUserId : auth.user.id;
        const filtered =
            auth.user.role === "ADMIN" && !requestedUserId
                ? resumes
                : resumes.filter((resume) => resume.userId === targetUserId);

        return NextResponse.json({ data: filtered });
    } catch (error) {
        console.error("[GET /api/resumes]", error);
        return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const contentType = request.headers.get("content-type") || "";
        let body: any = {};
        let fileBuffer: Buffer | undefined;

        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            body = {
                fileName: formData.get("fileName") as string,
                fileUrl: formData.get("fileUrl") as string,
                filePublicId: formData.get("filePublicId") as string,
                userId: formData.get("userId") as string,
                targetRole: formData.get("targetRole") as string,
                skills: formData.get("skills") ? JSON.parse(formData.get("skills") as string) : undefined,
                experienceYears: formData.get("experienceYears") ? Number(formData.get("experienceYears")) : undefined,
            };
            const file = formData.get("file") as File | null;
            if (file) {
                fileBuffer = Buffer.from(await file.arrayBuffer());
            }
        } else {
            body = await request.json();
        }

        if (typeof body.fileName !== "string" || typeof body.fileUrl !== "string") {
            return NextResponse.json(
                { error: "fileName and fileUrl are required" },
                { status: 400 }
            );
        }

        const fileName = body.fileName;
        const fileUrl = body.fileUrl;
        const safeTargetRole = sanitizeTargetRole(body.targetRole);

        try {
            await syncSessionUser(auth.user);
        } catch (e) {
            console.error("[POST /api/resumes] syncSessionUser failed, continuing in JSON fallback mode. EXACT ERROR:", e);
        }

        let skills = Array.isArray(body.skills)
            ? body.skills.filter((s: unknown): s is string => typeof s === "string" && !!s.trim()).map((s) => s.trim())
            : [];

        let parsedText: string | undefined;
        let parserUsed: string | undefined;

        if (skills.length === 0) {
            try {
                const allJobs = await getAllJobs();
                const knownSkills = buildKnownSkillCatalog(allJobs as any);
                const extracted = await extractTextFromResumeFile({
                    fileUrl,
                    fileName,
                    filePublicId: typeof body.filePublicId === "string" ? body.filePublicId : undefined,
                    fileBuffer,
                });
                parserUsed = extracted.parser;
                parsedText = extracted.text.replace(/\s+/g, " ").trim().slice(0, 20000);

                if (parsedText) {
                    skills = extractSkillsFromText({ text: parsedText, knownSkills });
                }
            } catch (e) {
                console.warn("[POST /api/resumes] Failed to extract text/skills", e);
            }
        }

        try {
            const newResume = await prisma.resume.create({
                data: {
                    userId: auth.user.id,
                    fileName,
                    fileUrl,
                    filePublicId: typeof body.filePublicId === "string" ? body.filePublicId : undefined,
                    skills,
                    targetRole: safeTargetRole,
                    experienceYears: typeof body.experienceYears === "number" ? body.experienceYears : undefined,
                    parsedText:
                        typeof body.parsedText === "string"
                            ? body.parsedText
                            : parsedText
                              ? parsedText
                              : undefined,
                },
            });

            return NextResponse.json(
                {
                    data: newResume,
                    message: "Resume uploaded successfully",
                    meta: { parserUsed },
                },
                { status: 201 }
            );
        } catch (e) {
            console.error("[POST /api/resumes] Prisma write failed, falling back to JSON store. EXACT ERROR:", e);
        }

        const jsonResume = {
            id: `resume-${crypto.randomUUID()}`,
            userId: auth.user.id,
            candidateName: auth.user.name ?? "User",
            email: auth.user.email ?? undefined,
            targetRole: safeTargetRole,
            experienceYears: typeof body.experienceYears === "number" ? body.experienceYears : undefined,
            education: typeof body.education === "string" ? body.education : undefined,
            skills,
            experience: Array.isArray(body.experience) ? body.experience : undefined,
            summary:
                typeof body.summary === "string"
                    ? body.summary
                    : parsedText
                      ? parsedText.slice(0, 2000)
                      : undefined,
            parsedText,
            fileName,
            fileUrl,
            uploadedAt: new Date().toISOString(),
        };

        const resumesPath = path.join(process.cwd(), "data", "resumes.json");
        const existingRaw = await fs.readFile(resumesPath, "utf8").catch(() => "[]");
        const existing = (JSON.parse(existingRaw) as unknown[]).filter(Boolean);
        const updated = [jsonResume, ...existing];
        await fs.writeFile(resumesPath, JSON.stringify(updated, null, 4), "utf8");

        return NextResponse.json(
            {
                data: jsonResume,
                message: "Resume uploaded successfully (JSON fallback)",
                meta: { parserUsed },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[POST /api/resumes]", error);
        return NextResponse.json({ error: "Failed to save resume" }, { status: 500 });
    }
}
