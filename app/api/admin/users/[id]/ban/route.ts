import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../../lib/prisma";
import { requireSessionUser } from "../../../../../../lib/api-auth";
import { serverError, validateCsrf } from "../../../../../../lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
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

        const body = (await request.json().catch(() => ({}))) as { banned?: boolean };
        if (typeof body.banned !== "boolean") {
            return NextResponse.json({ error: "Invalid ban payload" }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: params.id },
            data: { banned: body.banned },
            select: { id: true, banned: true },
        });

        return NextResponse.json({
            data: updated,
            message: updated.banned ? "User banned successfully" : "User unbanned successfully",
        });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        console.error(`[PATCH /api/admin/users/${params.id}/ban]`, error);
        return serverError("Failed to update user status");
    }
}
