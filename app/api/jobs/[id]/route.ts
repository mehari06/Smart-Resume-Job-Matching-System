import { NextRequest, NextResponse } from "next/server";
import { getJobById } from "../../../../lib/data";
import { isOwnerOrAdmin, requireSessionUser, syncSessionUser } from "../../../../lib/api-auth";
import { parseJobSource, parseJobType, serializeJob } from "../../../../lib/job-utils";
import prisma from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/[id]   - Public: get single job detail
 * PUT /api/jobs/[id]   - Recruiter: update job
 * DELETE /api/jobs/[id] - Recruiter: delete job
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
        const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

        await syncSessionUser(auth.user);

        const job = await prisma.job.findUnique({ where: { id: params.id } });
        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (!isOwnerOrAdmin(auth.user, job.postedById)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = (await request.json()) as Record<string, unknown>;
        const updated = await prisma.job.update({
            where: { id: job.id },
            data: {
                title: typeof body.title === "string" ? body.title.trim() : undefined,
                company: typeof body.company === "string" ? body.company.trim() : undefined,
                location: typeof body.location === "string" ? body.location.trim() : undefined,
                type: body.type !== undefined ? parseJobType(body.type) : undefined,
                salary: typeof body.salary === "string" ? body.salary.trim() || null : undefined,
                description: typeof body.description === "string" ? body.description.trim() : undefined,
                skills: Array.isArray(body.skills)
                    ? body.skills.filter((skill): skill is string => typeof skill === "string" && !!skill.trim())
                    : undefined,
                source: body.source !== undefined ? parseJobSource(body.source) : undefined,
                category: typeof body.category === "string" ? body.category.trim() : undefined,
                experience: typeof body.experience === "string" ? body.experience.trim() : undefined,
                deadline: typeof body.deadline === "string"
                    ? (body.deadline ? new Date(body.deadline) : null)
                    : undefined,
            },
        });

        return NextResponse.json({ data: serializeJob(updated), message: "Job updated" });
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
        const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

        await syncSessionUser(auth.user);

        const job = await prisma.job.findUnique({ where: { id: params.id } });
        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (!isOwnerOrAdmin(auth.user, job.postedById)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.job.delete({ where: { id: job.id } });

        return NextResponse.json({ message: `Job ${params.id} deleted` });
    } catch (error) {
        console.error(`[DELETE /api/jobs/${params.id}]`, error);
        return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
    }
}
