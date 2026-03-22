import { NextResponse } from "next/server";
import { requireSessionUser, syncSessionUser } from "../../../../lib/api-auth";
import prisma from "../../../../lib/prisma";
import { getAccountProfile, upsertAccountProfile } from "../../../../lib/user-profile-store";

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
        const profile = await getAccountProfile(auth.user.id);

        return NextResponse.json({
            data: {
                ...user,
                profile: profile ?? undefined,
            },
        });
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

        const body = (await request.json()) as {
            name?: string;
            firstName?: string;
            lastName?: string;
            city?: string;
            age?: number;
            education?: string;
            fieldOfStudy?: string;
            isStudent?: boolean;
        };
        const name = typeof body.name === "string" ? body.name.trim() : "";

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        await syncSessionUser(auth.user);

        const updated = await prisma.user.update({
            where: { id: auth.user.id },
            data: { name },
        });

        const profile = await upsertAccountProfile(auth.user.id, {
            firstName: typeof body.firstName === "string" ? body.firstName.trim() : undefined,
            lastName: typeof body.lastName === "string" ? body.lastName.trim() : undefined,
            city: typeof body.city === "string" ? body.city.trim() : undefined,
            age: typeof body.age === "number" && Number.isFinite(body.age) ? body.age : undefined,
            education: typeof body.education === "string" ? body.education.trim() : undefined,
            fieldOfStudy: typeof body.fieldOfStudy === "string" ? body.fieldOfStudy.trim() : undefined,
            isStudent: typeof body.isStudent === "boolean" ? body.isStudent : undefined,
        });

        return NextResponse.json({
            data: {
                ...updated,
                profile,
            },
            message: "Profile updated",
        });
    } catch (error) {
        console.error("[PUT /api/users/me]", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
