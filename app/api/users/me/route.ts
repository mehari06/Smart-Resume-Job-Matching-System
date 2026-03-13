import { NextResponse } from "next/server";
import { requireSessionUser, syncSessionUser } from "../../../../lib/api-auth";
import prisma from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/me
 * Returns the current authenticated user's profile.
 * Protected - returns 401 if not signed in.
 */
export async function GET() {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const user = await syncSessionUser(auth.user);

        return NextResponse.json({ data: user });
    } catch (error) {
        console.error("[GET /api/users/me]", error);
        return NextResponse.json({ error: "Failed to get user profile" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const body = (await request.json()) as { name?: string };
        const name = typeof body.name === "string" ? body.name.trim() : "";

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        await syncSessionUser(auth.user);

        const updated = await prisma.user.update({
            where: { id: auth.user.id },
            data: { name },
        });

        return NextResponse.json({ data: updated, message: "Profile updated" });
    } catch (error) {
        console.error("[PUT /api/users/me]", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
