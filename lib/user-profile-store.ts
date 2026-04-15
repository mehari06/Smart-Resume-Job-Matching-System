import fs from "node:fs/promises";
import path from "node:path";
import prisma from "./prisma";

export type AccountProfile = {
    userId: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    age?: number;
    education?: string;
    fieldOfStudy?: string;
    isStudent?: boolean;
    updatedAt: string;
};

const PROFILE_PATH = path.join(process.cwd(), "data", "user_profiles.json");
const SHOULD_USE_JSON_FALLBACK = process.env.NODE_ENV !== "production" && !process.env.VERCEL;

async function loadProfiles(): Promise<Record<string, AccountProfile>> {
    const raw = await fs.readFile(PROFILE_PATH, "utf8").catch(() => "{}");
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object") {
            return parsed as Record<string, AccountProfile>;
        }
    } catch {
        // Fall through and return empty object for malformed local data.
    }
    return {};
}

async function saveProfiles(profiles: Record<string, AccountProfile>) {
    await fs.mkdir(path.dirname(PROFILE_PATH), { recursive: true });
    await fs.writeFile(PROFILE_PATH, JSON.stringify(profiles, null, 4), "utf8");
}

export async function getAccountProfile(userId: string): Promise<AccountProfile | null> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                city: true,
                age: true,
                education: true,
                fieldOfStudy: true,
                isStudent: true,
                updatedAt: true,
            },
        });

        if (user) {
            return {
                userId: user.id,
                firstName: user.firstName ?? undefined,
                lastName: user.lastName ?? undefined,
                city: user.city ?? undefined,
                age: user.age ?? undefined,
                education: user.education ?? undefined,
                fieldOfStudy: user.fieldOfStudy ?? undefined,
                isStudent: user.isStudent ?? false,
                updatedAt: user.updatedAt.toISOString(),
            };
        }
    } catch (error) {
        console.warn("[user-profile-store] Prisma read failed", error);
    }

    if (!SHOULD_USE_JSON_FALLBACK) {
        return null;
    }

    const profiles = await loadProfiles();
    return profiles[userId] ?? null;
}

export async function upsertAccountProfile(
    userId: string,
    patch: Omit<Partial<AccountProfile>, "userId" | "updatedAt">
): Promise<AccountProfile> {
    try {
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: patch.firstName,
                lastName: patch.lastName,
                city: patch.city,
                age: patch.age,
                education: patch.education,
                fieldOfStudy: patch.fieldOfStudy,
                isStudent: patch.isStudent ?? false,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                city: true,
                age: true,
                education: true,
                fieldOfStudy: true,
                isStudent: true,
                updatedAt: true,
            },
        });

        return {
            userId: updated.id,
            firstName: updated.firstName ?? undefined,
            lastName: updated.lastName ?? undefined,
            city: updated.city ?? undefined,
            age: updated.age ?? undefined,
            education: updated.education ?? undefined,
            fieldOfStudy: updated.fieldOfStudy ?? undefined,
            isStudent: updated.isStudent ?? false,
            updatedAt: updated.updatedAt.toISOString(),
        };
    } catch (error) {
        console.warn("[user-profile-store] Prisma write failed", error);
    }

    const profiles = await loadProfiles();
    const next: AccountProfile = {
        ...(profiles[userId] ?? { userId }),
        ...patch,
        userId,
        updatedAt: new Date().toISOString(),
    };

    if (!SHOULD_USE_JSON_FALLBACK) {
        throw new Error("Profile persistence is unavailable");
    }

    profiles[userId] = next;
    await saveProfiles(profiles);
    return next;
}
