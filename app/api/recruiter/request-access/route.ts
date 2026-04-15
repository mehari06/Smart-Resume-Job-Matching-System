import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const [{ requireSessionUser }, { default: prisma }] = await Promise.all([
            import("../../../../lib/api-auth"),
            import("../../../../lib/prisma"),
        ]);

        const auth = await requireSessionUser();
        if ("error" in auth) return auth.error;

        const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        if (user.role === "ADMIN" || user.role === "RECRUITER") {
            return NextResponse.json({ error: "Already have elevated access" }, { status: 400 });
        }

        if (user.approvalStatus === "PENDING" || user.approvalStatus === "APPROVED") {
             return NextResponse.json({ error: "Request already pending or approved" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { approvalStatus: "PENDING" }
        });

        return NextResponse.json({ success: true, status: updatedUser.approvalStatus });
    } catch (error) {
        console.error("Failed to request recruiter access", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// GET: Returns the current approval status for the logged-in user
export async function GET(request: NextRequest) {
    try {
        const [{ requireSessionUser }, { default: prisma }] = await Promise.all([
            import("../../../../lib/api-auth"),
            import("../../../../lib/prisma"),
        ]);

        const auth = await requireSessionUser();
        if ("error" in auth) return auth.error;

        const user = await prisma.user.findUnique({
            where: { id: auth.user.id },
            select: { approvalStatus: true, role: true }
        });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        return NextResponse.json({ approvalStatus: user.approvalStatus, role: user.role });
    } catch (error) {
        console.error("Failed to get recruiter status", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
