import { useQuery } from "@tanstack/react-query";
import { Resume, ApiResponse } from "../types";

export function useResumes(userId?: string) {
    return useQuery({
        queryKey: ["resumes", userId],
        queryFn: async () => {
            const url = userId ? `/api/resumes?userId=${userId}` : "/api/resumes";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch resumes");
            const json = (await res.json()) as ApiResponse<Resume[]>;
            return json.data;
        },
        enabled: !!userId,
    });
}
