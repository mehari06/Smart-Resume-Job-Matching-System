import { NextRequest, NextResponse } from "next/server";
import { getResumeById } from "../../../../lib/data";

/**
 * GET /api/resumes/[id]   — Get single resume (owner only in production)
 * DELETE /api/resumes/[id] — Delete resume (owner only)
 */

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // TODO: Add session ownership check
        const resume = getResumeById(params.id);
        if (!resume) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }
        // Never expose email in public response
        const { email: _email, ...safeResume } = resume;
        return NextResponse.json({ data: safeResume });
    } catch (error) {
        console.error(`[GET /api/resumes/${params.id}]`, error);
        return NextResponse.json({ error: "Failed to fetch resume" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // TODO: Session + ownership check, then delete from Cloudinary + DB
        const resume = getResumeById(params.id);
        if (!resume) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }
        return NextResponse.json({ message: `Resume ${params.id} deleted successfully` });
    } catch (error) {
        console.error(`[DELETE /api/resumes/${params.id}]`, error);
        return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 });
    }
}
