import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/jobs/[id]   — Public: get single job detail
 * PUT /api/jobs/[id]   — Recruiter: update job (stubbed)
 * DELETE /api/jobs/[id] — Recruiter: delete job (stubbed)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const [{ getJobById }, { serializeJob }, { serverError }, { default: prisma }] = await Promise.all([
            import("../../../../lib/data"),
            import("../../../../lib/job-utils"),
            import("../../../../lib/security"),
            import("../../../../lib/prisma"),
        ]);

        try {
            const dbJob = await prisma.job.findUnique({ where: { id: params.id } });
            if (dbJob) {
                return NextResponse.json({ data: serializeJob(dbJob) });
            }
        } catch {
            // Fall through to JSON fallback source.
        }

        const job = await getJobById(params.id);
        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        return NextResponse.json({ data: job });
    } catch (error) {
        console.error(`[GET /api/jobs/${params.id}]`, error);
        const { serverError } = await import("../../../../lib/security");
        return serverError("Failed to fetch job");
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const [
            { requireSessionUser, syncSessionUser },
            { parseJobSource, parseJobType },
            { default: prisma },
            { serverError, validateCsrf },
            { jobUpdateSchema },
        ] = await Promise.all([
            import("../../../../lib/api-auth"),
            import("../../../../lib/job-utils"),
            import("../../../../lib/prisma"),
            import("../../../../lib/security"),
            import("../../../../lib/validation"),
        ]);

        const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

        const csrfError = validateCsrf(request);
        if (csrfError) {
            return csrfError;
        }

        await syncSessionUser(auth.user);

        const existing = await prisma.job.findUnique({
            where: { id: params.id },
            select: { id: true, postedById: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (auth.user.role !== "ADMIN" && existing.postedById !== auth.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = (await request.json()) as Record<string, unknown>;
        const parsed = jobUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid job update payload" }, { status: 400 });
        }

        const rawDeadline =
            typeof parsed.data.deadline === "string" && parsed.data.deadline
                ? new Date(parsed.data.deadline)
                : parsed.data.deadline === null
                  ? null
                  : undefined;
        const deadline =
            rawDeadline === undefined
                ? undefined
                : rawDeadline === null
                  ? null
                  : Number.isNaN(rawDeadline.getTime())
                    ? null
                    : rawDeadline;

        const updated = await prisma.job.update({
            where: { id: params.id },
            data: {
                title: typeof parsed.data.title === "string" ? parsed.data.title.trim() : undefined,
                company: typeof parsed.data.company === "string" ? parsed.data.company.trim() : undefined,
                location: typeof parsed.data.location === "string" ? parsed.data.location.trim() : undefined,
                description: typeof parsed.data.description === "string" ? parsed.data.description.trim() : undefined,
                salary:
                    typeof parsed.data.salary === "string"
                        ? parsed.data.salary.trim() || null
                        : parsed.data.salary === null
                          ? null
                          : undefined,
                category: typeof parsed.data.category === "string" ? parsed.data.category.trim() : undefined,
                experience: typeof parsed.data.experience === "string" ? parsed.data.experience.trim() : undefined,
                type: parsed.data.type !== undefined ? parseJobType(parsed.data.type) : undefined,
                source: parsed.data.source !== undefined ? parseJobSource(parsed.data.source) : undefined,
                skills: Array.isArray(parsed.data.skills)
                    ? parsed.data.skills.filter((skill): skill is string => typeof skill === "string" && !!skill.trim())
                    : undefined,
                deadline,
            },
        });

        return NextResponse.json({ data: updated, message: "Job updated" });
    } catch (error) {
        console.error(`[PUT /api/jobs/${params.id}]`, error);
        const { serverError } = await import("../../../../lib/security");
        return serverError("Failed to update job");
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const [
            { requireSessionUser, syncSessionUser },
            { default: prisma },
            { serverError, validateCsrf },
        ] = await Promise.all([
            import("../../../../lib/api-auth"),
            import("../../../../lib/prisma"),
            import("../../../../lib/security"),
        ]);

        const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

        const csrfError = validateCsrf(_request);
        if (csrfError) {
            return csrfError;
        }

        await syncSessionUser(auth.user);

        const existing = await prisma.job.findUnique({
            where: { id: params.id },
            select: { id: true, postedById: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (auth.user.role !== "ADMIN" && existing.postedById !== auth.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.job.update({
            where: { id: params.id },
            data: { isActive: false },
        });

        return NextResponse.json({ message: `Job ${params.id} deleted` });
    } catch (error) {
        console.error(`[DELETE /api/jobs/${params.id}]`, error);
        const { serverError } = await import("../../../../lib/security");
        return serverError("Failed to delete job");
    }
}
