"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useJobs } from "../../hooks/useJobs";
import { Search, Filter, MapPin, Briefcase, Clock, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import type { Job } from "../../types";

const SOURCE_COLORS: Record<string, string> = {
    "Afriwork": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Ethiojobs": "bg-blue-50 text-blue-700 border-blue-200",
    "Shega Insights": "bg-purple-50 text-purple-700 border-purple-200",
    "Hugging Face": "bg-orange-50 text-orange-700 border-orange-200",
    "Internal": "bg-slate-50 text-slate-700 border-slate-200",
};

const DEFAULT_CATEGORIES = [
    "Engineering",
    "Data Science",
    "AI/ML",
    "DevOps",
    "Design",
    "Mobile",
    "Security",
    "Data",
    "Cloud",
    "Product",
    "QA",
    "Management",
    "Content",
    "Blockchain",
    "Hardware/IoT",
    "Networking",
    "Database",
];

const EXPERIENCE_LEVELS = ["All", "Entry-level", "Junior", "Mid-level", "Senior"];

function JobCard({ job }: { job: Job }) {
    const sourceColor = SOURCE_COLORS[job.source] ?? SOURCE_COLORS["Internal"];
    const daysAgo = Math.floor((Date.now() - new Date(job.postedAt).getTime()) / 86400000);

    return (
        <Card hover className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${sourceColor}`}>
                        {job.source}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900 leading-tight">{job.title}</h3>
                    <p className="mt-0.5 text-sm font-medium text-slate-600">{job.company}</p>
                </div>
                <span className="flex-shrink-0 rounded-xl bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {job.category}
                </span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                </span>
                <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {job.type} · {job.experience}
                </span>
                <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
                </span>
            </div>

            {job.salary && (
                <p className="text-sm font-medium text-emerald-700">{job.salary}</p>
            )}

            <div className="flex flex-wrap gap-1.5">
                {job.skills.slice(0, 5).map((skill) => (
                    <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {skill}
                    </span>
                ))}
                {job.skills.length > 5 && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                        +{job.skills.length - 5} more
                    </span>
                )}
            </div>

            <div className="mt-auto flex items-center gap-2 pt-2 border-t border-slate-100">
                <Button asChild size="sm" className="flex-1">
                    <Link href={`/jobs/${job.id}`}>
                        View Details
                    </Link>
                </Button>
                <span className="text-xs text-slate-400">{job.applicants ?? 0} applicants</span>
            </div>
        </Card>
    );
}

function JobCardSkeleton() {
    return (
        <Card className="flex flex-col gap-4">
            <div className="space-y-2">
                <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
                <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="flex gap-3">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-slate-200" />
                ))}
            </div>
        </Card>
    );
}

export default function JobsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Internal state for input before submitting query
    const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");

    // Active filters
    const [search, setSearch] = useState(searchParams.get("search") ?? "");
    const [category, setCategory] = useState(searchParams.get("category") ?? "All");
    const [experience, setExperience] = useState(searchParams.get("experience") ?? "All");
    const [page, setPage] = useState(1);

    // Fetch jobs via React Query
    const { data, isLoading, isError } = useJobs(page, search, category, experience);
    const jobs = data?.data ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;
    const categoriesFromApi = Array.isArray(data?.categories) ? data.categories : [];
    const categories = ["All", ...(categoriesFromApi.length > 0 ? categoriesFromApi : DEFAULT_CATEGORIES)];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    const handleCategoryChange = (cat: string) => {
        setCategory(cat);
        setPage(1);
    };

    const handleExperienceChange = (exp: string) => {
        setExperience(exp);
        setPage(1);
    };

    return (
        <div className="main-gradient min-h-screen">
            <Navbar />
            <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Browse Jobs</h1>
                    <p className="mt-2 text-slate-600">
                        {total > 0 ? `${total} jobs from Afriwork, Ethiojobs, Shega & more` : "Explore opportunities across Ethiopia's tech ecosystem"}
                    </p>
                </div>

                {/* Search + Filters */}
                <div className="mb-6 space-y-4">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                                type="search"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search jobs, companies, or skills..."
                                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="sm">
                            <Filter className="h-4 w-4" />
                            Search
                        </Button>
                    </form>

                    {/* Category tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => handleCategoryChange(cat)}
                                className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${category === cat
                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Experience filter */}
                    <div className="flex flex-wrap gap-2">
                        <span className="flex items-center text-xs font-medium text-slate-500">Experience:</span>
                        {EXPERIENCE_LEVELS.map((lvl) => (
                            <button
                                key={lvl}
                                onClick={() => handleExperienceChange(lvl)}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${experience === lvl
                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                    }`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Job Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {isLoading
                        ? Array.from({ length: 9 }).map((_, i) => <JobCardSkeleton key={i} />)
                        : jobs.map((job: Job) => <JobCard key={job.id} job={job} />)}
                </div>

                {isError && (
                    <Card className="py-16 text-center border-red-200 bg-red-50">
                        <p className="text-xl font-semibold text-red-700">Failed to load jobs</p>
                        <p className="mt-2 text-red-600">Please try again later.</p>
                    </Card>
                )}

                {!isLoading && !isError && jobs.length === 0 && (
                    <Card className="py-16 text-center">
                        <p className="text-2xl font-semibold text-slate-900">No jobs found</p>
                        <p className="mt-2 text-slate-600">Try a different search term or filter.</p>
                        <Button className="mt-4" onClick={() => { setSearchInput(""); setSearch(""); setCategory("All"); setExperience("All"); setPage(1); }}>
                            Clear filters
                        </Button>
                    </Card>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <span className="text-sm text-slate-600">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
