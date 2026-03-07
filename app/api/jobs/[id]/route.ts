import { NextRequest, NextResponse } from "next/server";
import { getJobById } from "../../../../lib/data";

/**
 * GET /api/jobs/[id]   — Public: get single job detail
 * PUT /api/jobs/[id]   — Recruiter: update job (stubbed)
 * DELETE /api/jobs/[id] — Recruiter: delete job (stubbed)
 */

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const job = await getJobById(params.id);
        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        return NextResponse.json({ data: job });
    } catch (error) {
        console.error(`[GET /api/jobs/${params.id}]`, error);
        return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // TODO: Check RECRUITER session
        const job = await getJobById(params.id);
        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        const body = (await request.json()) as Record<string, unknown>;
        const updated = { ...job, ...body, id: job.id };
        return NextResponse.json({ data: updated, message: "Job updated" });
    } catch (error) {
        console.error(`[PUT /api/jobs/${params.id}]`, error);
        return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // TODO: Check RECRUITER session and ownership
        const job = await getJobById(params.id);
        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        return NextResponse.json({ message: `Job ${params.id} deleted` });
    } catch (error) {
        console.error(`[DELETE /api/jobs/${params.id}]`, error);
        return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
    }
}
