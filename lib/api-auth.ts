import type { UserRole } from "../types";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import prisma from "./prisma";

export type SessionUser = {
    id: string;
    role: UserRole;
    email?: string | null;
    name?: string | null;
    image?: string | null;
};

export function unauthorized(message: string = "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message: string = "Forbidden") {
    return NextResponse.json({ error: message }, { status: 403 });
}

export async function getSessionUser(): Promise<SessionUser | null> {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return null;
    }

    const id = (session.user as any).id as string | undefined;
    const role = ((session.user as any).role ?? "SEEKER") as UserRole;

    if (!id) {
        return null;
    }

    return {
        id,
        role,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
    };
}

export async function requireSessionUser(allowedRoles?: UserRole[]) {
    const user = await getSessionUser();

    if (!user) {
        return { error: unauthorized() };
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return { error: forbidden() };
    }

    return { user };
}

export function isOwnerOrAdmin(user: SessionUser, ownerId?: string | null) {
    return user.role === "ADMIN" || (!!ownerId && user.id === ownerId);
}

export async function syncSessionUser(user: SessionUser) {
    const existingById = await prisma.user.findUnique({
        where: { id: user.id },
    });

    if (existingById) {
        return prisma.user.update({
            where: { id: user.id },
            data: {
                email: user.email ?? existingById.email ?? undefined,
                image: user.image ?? existingById.image ?? undefined,
                name: user.name ?? existingById.name ?? undefined,
                // Role is security-sensitive and should not be implicitly overwritten during "sync".
            },
        });
    }

    if (user.email) {
        const existingByEmail = await prisma.user.findUnique({
            where: { email: user.email },
        });

        if (existingByEmail) {
            return prisma.user.update({
                where: { id: existingByEmail.id },
                data: {
                    image: user.image ?? existingByEmail.image ?? undefined,
                    name: user.name ?? existingByEmail.name ?? undefined,
                    // Do not overwrite role implicitly.
                },
            });
        }
    }

    return prisma.user.create({
        data: {
            id: user.id,
            email: user.email ?? undefined,
            image: user.image ?? undefined,
            name: user.name ?? "User",
            role: user.role,
        },
    });
}
