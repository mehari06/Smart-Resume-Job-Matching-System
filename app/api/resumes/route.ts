import { NextRequest, NextResponse } from "next/server";
import { getAllResumes } from "../../../lib/data";

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

        const resumes = getAllResumes();
        const filtered = userId ? resumes.filter((r) => r.userId === userId) : resumes;

        return NextResponse.json({ data: filtered });
    } catch (error) {
        console.error("[GET /api/resumes]", error);
        return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // TODO: Add session check
        const body = (await request.json()) as Record<string, unknown>;

        if (!body.fileName || !body.fileUrl) {
            return NextResponse.json(
                { error: "fileName and fileUrl are required" },
                { status: 400 }
            );
        }

        // Stub: In production this writes to DB via Prisma
        // const resume = await db.resume.create({ data: { ... } });
        const newResume = {
            id: `resume-${Date.now()}`,
            userId: (body.userId as string) ?? "dev-user-001",
            candidateName: (body.candidateName as string) ?? "New User",
            fileName: body.fileName as string,
            fileUrl: body.fileUrl as string,
            filePublicId: body.filePublicId as string | undefined,
            skills: (body.skills as string[]) ?? [],
            targetRole: body.targetRole as string | undefined,
            uploadedAt: new Date().toISOString(),
        };

        return NextResponse.json(
            { data: newResume, message: "Resume uploaded successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("[POST /api/resumes]", error);
        return NextResponse.json({ error: "Failed to save resume" }, { status: 500 });
    }
}
