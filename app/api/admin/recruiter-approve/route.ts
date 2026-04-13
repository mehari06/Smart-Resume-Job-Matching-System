import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "../../../../lib/api-auth";
import prisma from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const auth = await requireSessionUser(["ADMIN"]);
        if ("error" in auth) return auth.error;

        const body = await request.json();
        const { userId, action } = body;

        if (!userId || (action !== "approve" && action !== "reject")) {
             return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        let data: any = { approvalStatus: action === "approve" ? "APPROVED" : "REJECTED" };
        if (action === "approve") {
            data.role = "RECRUITER";
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data
        });

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Failed to process approval", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
