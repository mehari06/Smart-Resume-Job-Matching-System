import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser, syncSessionUser } from "../../../../../../lib/api-auth";
import prisma from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireSessionUser(["RECRUITER", "ADMIN"]);
    if ("error" in auth) {
      return auth.error;
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
      console.error("[GET /api/recruiter/jobs/[jobId]/applications] syncSessionUser failed (continuing)", error);
    }

    const jobId = params.id;

    // Verify job belongs to this recruiter or recruiter is ADMIN
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { postedById: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (resolvedUser.role !== "ADMIN" && job.postedById !== resolvedUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const applications = await (prisma as any).application.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, image: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ data: applications, total: applications.length });
  } catch (error) {
    console.error("[GET /api/recruiter/jobs/[jobId]/applications]", error);
    return NextResponse.json(
      { error: "Failed to load applications" },
      { status: 500 }
    );
  }
}
