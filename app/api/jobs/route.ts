import { NextRequest, NextResponse } from "next/server";
import { getAllJobs, getFilteredJobs, getJobCategories } from "../../../lib/data";
import { requireSessionUser, syncSessionUser } from "../../../lib/api-auth";
import { parseJobSource, parseJobType, serializeJob } from "../../../lib/job-utils";
import prisma from "../../../lib/prisma";
import type { JobFilters } from "../../../types";

export const dynamic = "force-dynamic";
const DEFAULT_RECRUITER_EMAIL = "mbereket523@gmail.com";
const DEFAULT_RECRUITER_CATEGORIES = new Set([
    "IT Support & Networking",
    "Data & AI",
    "Fullstack Engineering",
    "Frontend Engineering",
]);

function shouldBelongToDefaultRecruiter(job: { category?: string; title?: string }) {
    if (job.category && DEFAULT_RECRUITER_CATEGORIES.has(job.category)) return true;
    const title = (job.title ?? "").toLowerCase();
    return title.includes("project manager") || title.includes("project management");
}

async function ensureDefaultRecruiterUser() {
    const existing = await prisma.user.findUnique({
        where: { email: DEFAULT_RECRUITER_EMAIL },
    });
    if (existing) return existing;

    try {
        return await prisma.user.create({
            data: {
                email: DEFAULT_RECRUITER_EMAIL,
                name: "Default Recruiter",
                role: "RECRUITER",
            },
        });
    } catch (error: any) {
        if (error?.code === "P2002") {
            const retry = await prisma.user.findUnique({
                where: { email: DEFAULT_RECRUITER_EMAIL },
            });
            if (retry) return retry;
        }
        throw error;
    }
}

async function assignAllJsonJobsToDefaultRecruiter(ownerId: string) {
    const allJobs = await getAllJobs();
    if (!Array.isArray(allJobs) || allJobs.length === 0) return;

    for (const job of allJobs) {
        if (!shouldBelongToDefaultRecruiter(job)) continue;
        const postedAt = job.postedAt ? new Date(job.postedAt) : new Date();
        const deadline = job.deadline ? new Date(job.deadline) : null;
        const safePostedAt = Number.isNaN(postedAt.getTime()) ? new Date() : postedAt;
        const safeDeadline =
            deadline && !Number.isNaN(deadline.getTime()) ? deadline : null;

        await prisma.job.upsert({
            where: { id: job.id },
            create: {
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                type: parseJobType(job.type),
                salary: job.salary ?? null,
                description: job.description,
                skills: Array.isArray(job.skills) ? job.skills : [],
                source: parseJobSource(job.source),
                category: job.category ?? "Engineering",
                experience: job.experience ?? "Mid-level",
                isActive: true,
                postedAt: safePostedAt,
                deadline: safeDeadline,
                postedById: ownerId,
            },
            update: {
                postedById: ownerId,
            },
        });
    }
}

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
            const normalizedEmail = (auth.user.email ?? "").trim().toLowerCase();
            let ownerIdForMine = auth.user.id;
            let defaultOwnerId: string | null = null;

            try {
                const owner = await ensureDefaultRecruiterUser();
                defaultOwnerId = owner.id;
                await assignAllJsonJobsToDefaultRecruiter(owner.id);
                if (normalizedEmail === DEFAULT_RECRUITER_EMAIL || auth.user.id === owner.id) {
                    ownerIdForMine = owner.id;
                }
            } catch (e) {
                console.warn("[GET /api/jobs?mine=true] failed to assign JSON jobs to default recruiter", e);
            }

            const isDefaultRecruiter = normalizedEmail === DEFAULT_RECRUITER_EMAIL || (defaultOwnerId !== null && auth.user.id === defaultOwnerId);
            const ownJobs = await prisma.job.findMany({
                where: isDefaultRecruiter
                    ? {
                          postedById: ownerIdForMine,
                          isActive: true,
                          OR: [
                              { category: { in: Array.from(DEFAULT_RECRUITER_CATEGORIES) } },
                              { title: { contains: "project manager", mode: "insensitive" } },
                              { title: { contains: "project management", mode: "insensitive" } },
                          ],
                      }
                    : {
                          postedById: ownerIdForMine,
                          isActive: true,
                      },
                orderBy: { postedAt: "desc" },
            });

            if (ownJobs.length === 0 && defaultOwnerId) {
                const defaultOwnerJobs = await prisma.job.findMany({
                    where: {
                        postedById: defaultOwnerId,
                        isActive: true,
                        OR: [
                            { category: { in: Array.from(DEFAULT_RECRUITER_CATEGORIES) } },
                            { title: { contains: "project manager", mode: "insensitive" } },
                            { title: { contains: "project management", mode: "insensitive" } },
                        ],
                    },
                    orderBy: { postedAt: "desc" },
                });
                if (defaultOwnerJobs.length > 0) {
                    return NextResponse.json({
                        data: defaultOwnerJobs.map(serializeJob),
                        total: defaultOwnerJobs.length,
                        page: 1,
                        pageSize: defaultOwnerJobs.length,
                        totalPages: 1,
                        categories: await getJobCategories(),
                    });
                }
            }

            if (ownJobs.length === 0 && isDefaultRecruiter) {
                const allJobs = (await getAllJobs()).filter((job) => shouldBelongToDefaultRecruiter(job));
                return NextResponse.json({
                    data: allJobs,
                    total: allJobs.length,
                    page: 1,
                    pageSize: allJobs.length,
                    totalPages: 1,
                    categories: await getJobCategories(),
                });
            }

            return NextResponse.json({
                data: ownJobs.map(serializeJob),
                total: ownJobs.length,
                page: 1,
                pageSize: ownJobs.length,
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
        const owner = await ensureDefaultRecruiterUser();

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
                deadline: typeof body.deadline === "string" && body.deadline ? new Date(body.deadline) : null,
                postedById: owner.id,
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
