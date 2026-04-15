import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { requireSessionUser } from "../../../../../lib/api-auth";
import { serverError, validateCsrf } from "../../../../../lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireSessionUser(["ADMIN"]);
        if ("error" in auth) {
            return auth.error;
        }

        const csrfError = validateCsrf(request);
        if (csrfError) {
            return csrfError;
        }

        await prisma.job.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Job deleted successfully" });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        console.error(`[DELETE /api/admin/jobs/${params.id}]`, error);
        return serverError("Failed to delete job");
    }
}
