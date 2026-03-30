import { useQuery } from "@tanstack/react-query";
import type { Job } from "../types";

// Fetch paginated/filtered jobs list
export function useJobs(page: number = 1, searchQuery: string = "", category: string = "All", experience: string = "All") {
    return useQuery({
        queryKey: ["jobs", { page, searchQuery, category, experience }],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            searchParams.set("page", page.toString());
            searchParams.set("pageSize", "9");
            if (searchQuery) searchParams.set("search", searchQuery);
            if (category !== "All") searchParams.set("category", category);
            if (experience !== "All") searchParams.set("experience", experience);

            const res = await fetch(`/api/jobs?${searchParams.toString()}`);
            if (!res.ok) {
                throw new Error("Network response was not ok");
            }
            return res.json() as Promise<{
                data: Job[];
                total: number;
                totalPages: number;
                categories?: string[];
            }>;
        },
        staleTime: 60 * 1000, // 1 minute stale time
    });
}

// Fetch a single job by ID
export function useJob(id: string) {
    return useQuery({
        queryKey: ["job", id],
        queryFn: async () => {
            const res = await fetch(`/api/jobs/${id}`);
            if (!res.ok) {
                throw new Error("Job not found");
            }
            const json = await res.json();
            return json.data as Job;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5 minutes stale time
    });
}
