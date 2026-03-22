import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { isOwnerOrAdmin, requireSessionUser } from "../../../../lib/api-auth";
import prisma from "../../../../lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import { getTrustedUnixTimestampSeconds } from "../../../../lib/cloudinary-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

        const body = (await request.json()) as {
            skills?: unknown;
            targetRole?: unknown;
        };

        const skills = normalizeSkills(body.skills);
        const targetRole = typeof body.targetRole === "string" ? body.targetRole.trim() : undefined;

        if (skills.length === 0 && !targetRole) {
            return NextResponse.json(
                { error: "Provide at least one skill or targetRole" },
                { status: 400 }
            );
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
                        ...(skills.length ? { skills } : {}),
                        ...(targetRole ? { targetRole } : {}),
                    },
                });

                return NextResponse.json({ data: updated, message: "Resume updated" });
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
            ...(skills.length ? { skills } : {}),
            ...(targetRole ? { targetRole } : {}),
        };

        resumes[idx] = updated;
        await saveResumesJson(resumes);

        return NextResponse.json({ data: updated, message: "Resume updated (JSON fallback)" });
    } catch (error) {
        console.error(`[PATCH /api/resumes/${params.id}]`, error);
        return NextResponse.json({ error: "Failed to update resume" }, { status: 500 });
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
                        console.log(`[DELETE /api/resumes/${params.id}] Cloudinary destroy start. Id: ${resume.filePublicId}, TS: ${timestamp}`);
                        const cloudResult = await (cloudinary.uploader as any).destroy(resume.filePublicId, { 
                            resource_type: "raw",
                            timestamp
                        });
                        console.log(`[DELETE /api/resumes/${params.id}] Cloudinary result:`, JSON.stringify(cloudResult));
                    } catch (err) {
                        console.error(`[DELETE /api/resumes/${params.id}] Cloudinary destroy error (continuing to DB):`, err);
                    }
                }

                await prisma.resume.delete({
                    where: { id: params.id },
                });

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
                console.log(`[JSON DELETE /api/resumes/${params.id}] Cloudinary destroy start. PublicId: ${resume.filePublicId}, Timestamp: ${timestamp}`);
                const cloudResult = await (cloudinary.uploader as any).destroy(resume.filePublicId, { 
                    resource_type: "raw",
                    timestamp
                });
                console.log(`[JSON DELETE /api/resumes/${params.id}] Cloudinary destroy result:`, cloudResult);
            } catch (e) {
                console.warn("[DELETE /api/resumes/[id]] Cloudinary destroy (JSON fallback) failed", e);
            }
        }

        resumes.splice(idx, 1);
        await saveResumesJson(resumes);

        return NextResponse.json({ message: "Resume deleted successfully (JSON fallback)" });
    } catch (error) {
        console.error(`[DELETE /api/resumes/${params.id}]`, error);
        return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 });
    }
}
