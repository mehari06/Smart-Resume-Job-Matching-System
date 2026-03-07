import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

/**
 * GET /api/users/me
 * Returns the current authenticated user's profile.
 * Protected — returns 401 if not signed in.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = {
            id: (session.user as any).id ?? "dev-user",
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role: (session.user as any).role ?? "SEEKER",
        };

        return NextResponse.json({ data: user });
    } catch (error) {
        console.error("[GET /api/users/me]", error);
        return NextResponse.json({ error: "Failed to get user profile" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json()) as { name?: string; role?: string };

        // Stub: In production update DB record
        const updated = {
            id: (session.user as any).id,
            name: body.name ?? session.user.name,
            email: session.user.email,
            image: session.user.image,
            role: body.role ?? (session.user as any).role ?? "SEEKER",
        };

        return NextResponse.json({ data: updated, message: "Profile updated" });
    } catch (error) {
        console.error("[PUT /api/users/me]", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
