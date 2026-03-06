import { NextRequest, NextResponse } from "next/server";
import { getFilteredJobs, getJobCategories } from "../../../lib/data";
import type { JobFilters } from "../../../types";

/**
 * GET /api/jobs
 * Query params: search, category, source, experience, type, page, pageSize
 *
 * POST /api/jobs
 * Body: { title, company, ... } — Recruiter creates a new job (stubbed, no DB yet)
 */

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const filters: JobFilters = {
            search: searchParams.get("search") ?? undefined,
            category: searchParams.get("category") ?? undefined,
            source: (searchParams.get("source") as JobFilters["source"]) ?? undefined,
            experience: (searchParams.get("experience") as JobFilters["experience"]) ?? undefined,
            type: (searchParams.get("type") as JobFilters["type"]) ?? undefined,
        };

        const page = parseInt(searchParams.get("page") ?? "1", 10);
        const pageSize = parseInt(searchParams.get("pageSize") ?? "9", 10);

        const { jobs, total, totalPages } = getFilteredJobs(filters, page, pageSize);
        const categories = getJobCategories();

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
        // TODO: Add getServerSession(authOptions) check for RECRUITER role
        const body = (await request.json()) as Record<string, unknown>;

        // Validate required fields
        if (!body.title || !body.company || !body.description) {
            return NextResponse.json(
                { error: "title, company, and description are required" },
                { status: 400 }
            );
        }

        // Stub: In production this would write to DB via Prisma
        const newJob = {
            id: `job-${Date.now()}`,
            title: body.title as string,
            company: body.company as string,
            location: (body.location as string) ?? "Addis Ababa, Ethiopia",
            type: (body.type as string) ?? "Full-time",
            salary: body.salary as string | undefined,
            description: body.description as string,
            skills: (body.skills as string[]) ?? [],
            source: "Internal",
            category: (body.category as string) ?? "Engineering",
            experience: (body.experience as string) ?? "Mid-level",
            postedAt: new Date().toISOString(),
            deadline: body.deadline as string | undefined,
            applicants: 0,
        };

        return NextResponse.json({ data: newJob, message: "Job created successfully" }, { status: 201 });
    } catch (error) {
        console.error("[POST /api/jobs]", error);
        return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }
}
