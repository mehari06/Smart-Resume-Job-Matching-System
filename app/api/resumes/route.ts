import { NextRequest, NextResponse } from "next/server";
import { getAllResumes } from "../../../lib/data";
import { requireSessionUser, syncSessionUser } from "../../../lib/api-auth";
import prisma from "../../../lib/prisma";

export const dynamic = "force-dynamic";

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

        const body = (await request.json()) as Record<string, unknown>;

        if (!body.fileName || !body.fileUrl) {
            return NextResponse.json(
                { error: "fileName and fileUrl are required" },
                { status: 400 }
            );
        }

        await syncSessionUser(auth.user);

        const newResume = await prisma.resume.create({
            data: {
                userId: auth.user.id,
                fileName: body.fileName as string,
                fileUrl: body.fileUrl as string,
                filePublicId: body.filePublicId as string | undefined,
                skills: (body.skills as string[]) ?? [],
                targetRole: body.targetRole as string | undefined,
            },
        });

        return NextResponse.json(
            { data: newResume, message: "Resume uploaded successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("[POST /api/resumes]", error);
        return NextResponse.json({ error: "Failed to save resume" }, { status: 500 });
    }
}
