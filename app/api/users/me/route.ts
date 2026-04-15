import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser, syncSessionUser } from "../../../../lib/api-auth";
import prisma from "../../../../lib/prisma";
import { getAccountProfile, upsertAccountProfile } from "../../../../lib/user-profile-store";
import { serverError, validateCsrf } from "../../../../lib/security";
import { profileUpdateSchema } from "../../../../lib/validation";

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
        const profile = await getAccountProfile(user.id);

        return NextResponse.json({
            data: {
                ...user,
                profile: profile ?? undefined,
            },
        });
    } catch (error) {
        console.error("[GET /api/users/me]", error);
        return serverError("Failed to get user profile");
    }
}

export async function PUT(request: NextRequest) {
    try {
        const auth = await requireSessionUser();
        if ("error" in auth) {
            return auth.error;
        }

        const csrfError = validateCsrf(request);
        if (csrfError) {
            return csrfError;
        }

        const body = (await request.json()) as Record<string, unknown>;
        const parsed = profileUpdateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
        }

        const syncedUser = await syncSessionUser(auth.user);

        const updated = await prisma.user.update({
            where: { id: syncedUser.id },
            data: { name: parsed.data.name },
        });

        const profile = await upsertAccountProfile(syncedUser.id, {
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            city: parsed.data.city,
            age: parsed.data.age,
            education: parsed.data.education,
            fieldOfStudy: parsed.data.fieldOfStudy,
            isStudent: parsed.data.isStudent,
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
        return serverError("Failed to update profile");
    }
}
