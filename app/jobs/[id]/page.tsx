import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";

export const dynamic = "force-dynamic";

import { getJobById } from "../../../lib/data";
import { Navbar } from "../../../components/Navbar";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { JobApplyPanel } from "../../../components/JobApplyPanel";
import { MapPin, Briefcase, Clock, Users, ArrowLeft, ExternalLink } from "lucide-react";
import type { Job } from "../../../types";

interface Props {
    params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const job = await getJobById(params.id);
    if (!job) return { title: "Job Not Found" };
    return {
        title: `${job.title} at ${job.company}`,
        description: `${job.title} — ${job.company}, ${job.location}. ${job.skills.slice(0, 4).join(", ")}.`,
    };
}

const SOURCE_COLORS: Record<string, string> = {
    "Afriwork": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Ethiojobs": "bg-blue-50 text-blue-700 border-blue-200",
    "Shega Insights": "bg-purple-50 text-purple-700 border-purple-200",
};

export default async function JobDetailPage({ params }: Props) {
    const job = await getJobById(params.id);
    if (!job) notFound();

    const sourceColor = SOURCE_COLORS[job.source] ?? "bg-slate-50 text-slate-700 border-slate-200";
    const daysAgo = Math.floor((Date.now() - new Date(job.postedAt).getTime()) / 86400000);
    const deadlineDays = job.deadline
        ? Math.ceil((new Date(job.deadline).getTime() - Date.now()) / 86400000)
        : null;

    return (
        <div className="main-gradient min-h-screen">
            <Navbar />
            <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Back link */}
                <Link href="/jobs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4" />
                    Back to all jobs
                </Link>

                <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Main content */}
                    <div className="space-y-6">
                        <Card>
                            <div className="flex flex-wrap items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${sourceColor}`}>
                                        {job.source}
                                    </span>
                                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{job.title}</h1>
                                    <p className="mt-1 text-lg font-medium text-slate-600">{job.company}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}</span>
                                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{job.type} · {job.experience}</span>
                                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{daysAgo === 0 ? "Posted today" : `Posted ${daysAgo}d ago`}</span>
                                {job.applicants && <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{job.applicants} applicants</span>}
                            </div>

                            {job.salary && (
                                <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5">
                                    <p className="text-sm font-semibold text-emerald-800">💰 {job.salary}</p>
                                </div>
                            )}

                            {deadlineDays !== null && (
                                <div className={`mt-2 rounded-xl border px-4 py-2.5 ${deadlineDays <= 7 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                                    <p className={`text-sm font-medium ${deadlineDays <= 7 ? "text-red-700" : "text-amber-700"}`}>
                                        ⏰ Application deadline: {deadlineDays > 0 ? `${deadlineDays} days left` : "Closed"}
                                    </p>
                                </div>
                            )}
                        </Card>

                        {/* Job Description */}
                        <Card>
                            <h2 className="text-xl font-semibold text-slate-900 mb-4">Job Description</h2>
                            <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                                <ReactMarkdown>
                                    {job.description}
                                </ReactMarkdown>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <Card className="sticky top-20">
                            <div className="mb-4">
                                <Button className="w-full text-base font-semibold py-6 shadow-md shadow-indigo-500/20" asChild>
                                    <Link href={`/jobs/${job.id}/apply`}>Apply Now</Link>
                                </Button>
                            </div>
                            
                            <JobApplyPanel jobId={job.id} />

                            <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Category</p>
                                    <p className="mt-1 text-sm text-slate-700">{job.category}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Experience</p>
                                    <p className="mt-1 text-sm text-slate-700">{job.experience}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Job Type</p>
                                    <p className="mt-1 text-sm text-slate-700">{job.type}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Source</p>
                                    <p className="mt-1 text-sm text-slate-700">{job.source}</p>
                                </div>
                            </div>

                            {/* Skills */}
                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">Required Skills</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {job.skills.map((skill) => (
                                        <span key={skill} className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        {/* Similar jobs link */}
                        <Card>
                            <p className="text-sm font-medium text-slate-700">
                                Browse more {job.category} jobs
                            </p>
                            <Link
                                href={`/jobs?category=${encodeURIComponent(job.category)}`}
                                className="mt-2 flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                            >
                                See all {job.category} jobs <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
