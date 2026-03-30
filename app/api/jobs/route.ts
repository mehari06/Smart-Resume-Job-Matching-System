import { NextRequest, NextResponse } from "next/server";
import { getAllJobs, getFilteredJobs, getJobCategories } from "../../../lib/data";
import { requireSessionUser, syncSessionUser } from "../../../lib/api-auth";
import { parseJobSource, parseJobType, serializeJob } from "../../../lib/job-utils";
import prisma from "../../../lib/prisma";
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

        const page = parseInt(searchParams.get("page") ?? "1", 10);
        const pageSize = parseInt(searchParams.get("pageSize") ?? "9", 10);

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
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

        const body = (await request.json()) as Record<string, unknown>;

        if (
            typeof body.title !== "string" ||
            typeof body.company !== "string" ||
            typeof body.description !== "string"
        ) {
            return NextResponse.json(
                { error: "title, company, and description are required" },
                { status: 400 }
            );
        }

        await syncSessionUser(auth.user);

        const rawDeadline = typeof body.deadline === "string" && body.deadline ? new Date(body.deadline) : null;
        const deadline = rawDeadline && !Number.isNaN(rawDeadline.getTime()) ? rawDeadline : null;

        const createdJob = await prisma.job.create({
            data: {
                title: body.title.trim(),
                company: body.company.trim(),
                location: typeof body.location === "string" ? body.location.trim() : "Addis Ababa, Ethiopia",
                type: parseJobType(body.type),
                salary: typeof body.salary === "string" && body.salary.trim() ? body.salary.trim() : null,
                description: body.description.trim(),
                skills: Array.isArray(body.skills)
                    ? body.skills.filter((skill): skill is string => typeof skill === "string" && !!skill.trim())
                    : [],
                source: parseJobSource(body.source),
                category: typeof body.category === "string" && body.category.trim() ? body.category.trim() : "Engineering",
                experience: typeof body.experience === "string" && body.experience.trim() ? body.experience.trim() : "Mid-level",
                deadline,
                postedById: auth.user.id,
            },
        });

        return NextResponse.json(
            { data: serializeJob(createdJob), message: "Job created successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("[POST /api/jobs]", error);
        return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }
}
