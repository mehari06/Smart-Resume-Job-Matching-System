import { useQuery } from "@tanstack/react-query";
import type { MatchResult } from "../types";

// Fetch pre-computed matches for a given resume ID
export function useMatches(resumeId: string) {
    return useQuery({
        queryKey: ["matches", resumeId],
        queryFn: async () => {
            const res = await fetch(`/api/matches?resumeId=${encodeURIComponent(resumeId)}`);
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload?.error ?? "Failed to load match results");
            }
            const json = await res.json();
            return json.data as MatchResult;
        },
        enabled: !!resumeId,
        staleTime: 5 * 60 * 1000, // 5 minutes (matches don't change often)
    });
}
