import fs from "node:fs/promises";
import path from "node:path";

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
    const profiles = await loadProfiles();
    return profiles[userId] ?? null;
}

export async function upsertAccountProfile(
    userId: string,
    patch: Omit<Partial<AccountProfile>, "userId" | "updatedAt">
): Promise<AccountProfile> {
    const profiles = await loadProfiles();
    const next: AccountProfile = {
        ...(profiles[userId] ?? { userId }),
        ...patch,
        userId,
        updatedAt: new Date().toISOString(),
    };
    profiles[userId] = next;
    await saveProfiles(profiles);
    return next;
}
