import { NextRequest, NextResponse } from "next/server";
import { getAllJobs, getFilteredJobs, getJobCategories } from "../../../lib/data";
import { requireSessionUser, syncSessionUser } from "../../../lib/api-auth";
import { parseJobSource, parseJobType, serializeJob } from "../../../lib/job-utils";
import prisma from "../../../lib/prisma";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { serverError, validateCsrf } from "../../../lib/security";
import { jobCreateSchema } from "../../../lib/validation";
import type { JobFilters } from "../../../types";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs
 * Query params: search, category, source, experience, type, page, pageSize
 *
 * POST /api/jobs
 * Body: { title, company, ... } - Recruiter creates a new job
 */

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const mine = searchParams.get("mine") === "true";

        if (mine) {
            const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
            if ("error" in auth) {
                return auth.error;
            }

            await syncSessionUser(auth.user);
            const ownJobs = await prisma.job.findMany({
                where: {
                    postedById: auth.user.id,
                    isActive: true,
                },
                orderBy: { postedAt: "desc" },
                include: {
                    _count: {
                        select: {
                            matches: true,
                        },
                    },
                },
            });

            const ownJobsWithApplicants = ownJobs.map((job) => ({
                ...serializeJob(job),
                applicants: job._count.matches,
            }));

            return NextResponse.json({
                data: ownJobsWithApplicants,
                total: ownJobsWithApplicants.length,
                page: 1,
                pageSize: ownJobsWithApplicants.length,
                totalPages: 1,
                categories: await getJobCategories(),
            });
        }

        const filters: JobFilters = {
            search: searchParams.get("search") ?? undefined,
            category: searchParams.get("category") ?? undefined,
            source: (searchParams.get("source") as JobFilters["source"]) ?? undefined,
            experience: (searchParams.get("experience") as JobFilters["experience"]) ?? undefined,
            type: (searchParams.get("type") as JobFilters["type"]) ?? undefined,
        };

        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
        const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "9", 10)));

        const { jobs, total, totalPages } = await getFilteredJobs(filters, page, pageSize);
        const categories = await getJobCategories();

        return NextResponse.json({
            data: jobs,
            total,
            page,
            pageSize,
            totalPages,
            categories,
        });
    } catch (error) {
        console.error("[GET /api/jobs]", error);
        return serverError("Failed to fetch jobs");
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

        const csrfError = validateCsrf(request);
        if (csrfError) {
            return csrfError;
        }

        const rateLimitError = enforceRateLimit(request, {
            bucket: "job-create",
            userId: auth.user.id,
            limit: 20,
            windowMs: 10 * 60 * 1000,
            message: "Too many job creation attempts. Please wait before trying again.",
        });
        if (rateLimitError) {
            return rateLimitError;
        }

        const body = (await request.json()) as Record<string, unknown>;
        const parsed = jobCreateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid job payload",
                    details: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        let resolvedUser = auth.user;
        try {
            const syncedUser = await syncSessionUser(auth.user);
            if (syncedUser?.id) {
                resolvedUser = {
                    ...auth.user,
                    id: syncedUser.id,
                    name: syncedUser.name ?? auth.user.name,
                    email: syncedUser.email ?? auth.user.email,
                    image: syncedUser.image ?? auth.user.image,
                };
            }
        } catch (error) {
            console.error("[POST /api/jobs] syncSessionUser failed", error);
        }

        const rawDeadline =
            typeof parsed.data.deadline === "string" && parsed.data.deadline
                ? new Date(parsed.data.deadline)
                : null;
        const deadline = rawDeadline && !Number.isNaN(rawDeadline.getTime()) ? rawDeadline : null;

        const createdJob = await prisma.job.create({
            data: {
                title: parsed.data.title.trim(),
                company: parsed.data.company.trim(),
                location: parsed.data.location?.trim() || "Addis Ababa, Ethiopia",
                type: parseJobType(parsed.data.type),
                salary: typeof parsed.data.salary === "string" && parsed.data.salary.trim() ? parsed.data.salary.trim() : null,
                description: parsed.data.description.trim(),
                skills: parsed.data.skills ?? [],
                source: parseJobSource(parsed.data.source),
                category: parsed.data.category?.trim() || "Engineering",
                experience: parsed.data.experience?.trim() || "Mid-level",
                deadline,
                postedById: resolvedUser.id,
            },
        });

        return NextResponse.json(
            { data: serializeJob(createdJob), message: "Job created successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("[POST /api/jobs]", error);
        return serverError("Failed to create job");
    }
}
