import { NextRequest, NextResponse } from "next/server";
import { getAllResumes } from "../../../lib/data";
import prisma from "../../../lib/prisma";

/**
 * GET /api/resumes   — Returns resumes (filtered by userId in query)
 * POST /api/resumes  — Creates a resume record (upload handled client-side via Cloudinary)
 */

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        // TODO: Replace with session check:
        // const session = await getServerSession(authOptions);
        // if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const resumes = await getAllResumes();
        const filtered = userId ? resumes.filter((r) => r.userId === userId) : resumes;

        return NextResponse.json({ data: filtered });
    } catch (error) {
        console.error("[GET /api/resumes]", error);
        return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Record<string, unknown>;
        const userId = (body.userId as string | undefined) ?? "dev-user-001";

        if (!body.fileName || !body.fileUrl) {
            return NextResponse.json(
                { error: "fileName and fileUrl are required" },
                { status: 400 }
            );
        }

        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: typeof body.email === "string" ? body.email : undefined,
                name: typeof body.candidateName === "string" ? body.candidateName : "Dev User",
            },
        });

        // Save to database via Prisma
        const newResume = await prisma.resume.create({
            data: {
                userId,
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
