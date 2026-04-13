import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { isOwnerOrAdmin, requireSessionUser } from "../../../../lib/api-auth";
import prisma from "../../../../lib/prisma";
import { getTrustedUnixTimestampSeconds } from "../../../../lib/cloudinary-utils";
import { cloudinary, getSignedResumeAssetUrl } from "../../../../lib/cloudinary";
import { enforceRateLimit } from "../../../../lib/rate-limit";
import { serverError, validateCsrf } from "../../../../lib/security";
import { resumePatchSchema } from "../../../../lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadResumesJson(): Promise<any[]> {
    const resumesPath = path.join(process.cwd(), "data", "resumes.json");
    const raw = await fs.readFile(resumesPath, "utf8").catch(() => "[]");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
}

async function saveResumesJson(resumes: any[]) {
    const resumesPath = path.join(process.cwd(), "data", "resumes.json");
    await fs.writeFile(resumesPath, JSON.stringify(resumes, null, 4), "utf8");
}

function normalizeSkills(input: unknown): string[] {
    if (Array.isArray(input)) {
        return input
            .filter((s): s is string => typeof s === "string")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    if (typeof input === "string") {
        return input
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    return [];
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const csrfError = validateCsrf(request);
        if (csrfError) {
            return csrfError;
        }

        const body = (await request.json()) as { skills?: unknown; targetRole?: unknown };
        const parsed = resumePatchSchema.safeParse({
            skills: normalizeSkills(body.skills),
            targetRole: typeof body.targetRole === "string" ? body.targetRole.trim() : undefined,
        });

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid resume update payload" }, { status: 400 });
        }

        try {
            const existing = await prisma.resume.findUnique({ where: { id: params.id } });
            if (existing) {
                if (!isOwnerOrAdmin(auth.user, existing.userId)) {
                    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
                }

                const updated = await prisma.resume.update({
                    where: { id: params.id },
                    data: {
                        ...(parsed.data.skills?.length ? { skills: parsed.data.skills } : {}),
                        ...(parsed.data.targetRole ? { targetRole: parsed.data.targetRole } : {}),
                    },
                });

                return NextResponse.json({
                    data: {
                        ...updated,
                        fileUrl: getSignedResumeAssetUrl(updated.filePublicId, updated.fileUrl),
                    },
                    message: "Resume updated",
                });
            }
        } catch (e) {
            console.warn("[PATCH /api/resumes/[id]] Prisma failed, falling back to JSON", e);
        }

        const resumes = await loadResumesJson();
        const idx = resumes.findIndex((r) => r?.id === params.id);
        if (idx === -1) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }

        const resume = resumes[idx];
        if (!isOwnerOrAdmin(auth.user, resume.userId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updated = {
            ...resume,
            ...(parsed.data.skills?.length ? { skills: parsed.data.skills } : {}),
            ...(parsed.data.targetRole ? { targetRole: parsed.data.targetRole } : {}),
        };

        resumes[idx] = updated;
        await saveResumesJson(resumes);

        return NextResponse.json({
            data: {
                ...updated,
                fileUrl: getSignedResumeAssetUrl(updated.filePublicId, updated.fileUrl),
            },
            message: "Resume updated (JSON fallback)",
        });
    } catch (error) {
        console.error(`[PATCH /api/resumes/${params.id}]`, error);
        return serverError("Failed to update resume");
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const csrfError = validateCsrf(_request);
        if (csrfError) {
            return csrfError;
        }

        const rateLimitError = enforceRateLimit(_request, {
            bucket: "resume-delete",
            userId: auth.user.id,
            limit: 20,
            windowMs: 10 * 60 * 1000,
            message: "Too many delete requests. Please wait and try again.",
        });
        if (rateLimitError) {
            return rateLimitError;
        }

        try {
            const resume = await prisma.resume.findUnique({
                where: { id: params.id },
            });

            if (resume) {
                if (!isOwnerOrAdmin(auth.user, resume.userId)) {
                    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
                }

                if (resume.filePublicId) {
                    try {
                        const timestamp = await getTrustedUnixTimestampSeconds();
                        await (cloudinary.uploader as any).destroy(resume.filePublicId, {
                            resource_type: "raw",
                            type: "authenticated",
                            timestamp
                        });
                    } catch (err) {
                        // Cloudinary delete failures shouldn't block the DB delete (e.g. timestamp drift / already removed).
                        console.warn(`[DELETE /api/resumes/${params.id}] Cloudinary destroy failed`, err);
                    }
                }

                try {
                    await prisma.resume.delete({
                        where: { id: params.id },
                    });
                } catch (err: any) {
                    // Idempotency: if multiple delete requests race, treat "not found" as success.
                    if (err?.code !== "P2025") {
                        throw err;
                    }
                }

                return NextResponse.json({ message: "Resume deleted successfully" });
            }
        } catch (e) {
            console.warn("[DELETE /api/resumes/[id]] Prisma failed, falling back to JSON", e);
        }

        const resumes = await loadResumesJson();
        const idx = resumes.findIndex((r) => r?.id === params.id);
        if (idx === -1) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }
        const resume = resumes[idx];
        if (!isOwnerOrAdmin(auth.user, resume.userId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (resume.filePublicId) {
            try {
                const timestamp = await getTrustedUnixTimestampSeconds();
                await (cloudinary.uploader as any).destroy(resume.filePublicId, {
                    resource_type: "raw",
                    type: "authenticated",
                    timestamp
                });
            } catch (e) {
                console.warn("[DELETE /api/resumes/[id]] Cloudinary destroy (JSON fallback) failed", e);
            }
        }

        resumes.splice(idx, 1);
        await saveResumesJson(resumes);

        return NextResponse.json({ message: "Resume deleted successfully (JSON fallback)" });
    } catch (error) {
        console.error(`[DELETE /api/resumes/${params.id}]`, error);
        return serverError("Failed to delete resume");
    }
}
