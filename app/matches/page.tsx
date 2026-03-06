"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ArrowUpDown, Info, Search, TrendingUp, Target, AlertCircle } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CircularScore } from "../../components/CircularScore";
import { ProgressBar } from "../../components/ProgressBar";
import { Skeleton } from "../../components/Skeleton";
import { Tooltip as UITooltip } from "../../components/Tooltip";
import type { MatchResult, JobMatch } from "../../types";

type SortMode = "scoreDesc" | "scoreAsc";

const SCORE_COLORS = (score: number) => {
    if (score >= 80) return "#16a34a";
    if (score >= 60) return "#4f46e5";
    if (score >= 40) return "#d97706";
    return "#dc2626";
};

function MatchCardSkeleton() {
    return (
        <Card>
            <div className="flex items-center justify-between gap-4">
                <div className="w-full space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-20 w-20 flex-shrink-0 rounded-full" />
            </div>
        </Card>
    );
}

export default function MatchesPage() {
    const searchParams = useSearchParams();
    const resumeId = searchParams.get("resumeId") ?? "resume-001";

    const [result, setResult] = useState<MatchResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortMode, setSortMode] = useState<SortMode>("scoreDesc");
    const [skillQuery, setSkillQuery] = useState("");
    const [minScore, setMinScore] = useState(0);

    useEffect(() => {
        const fetchMatches = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/matches?resumeId=${encodeURIComponent(resumeId)}`);
                const json = await res.json();
                setResult(json.data ?? null);
            } catch {
                setError("Failed to load match results. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchMatches();
    }, [resumeId]);

    const matches = result?.matches ?? [];

    const visibleMatches = matches
        .filter((m) => {
            if (m.similarityScore < minScore) return false;
            if (!skillQuery.trim()) return true;
            return m.matchedSkills.some((s) => s.toLowerCase().includes(skillQuery.toLowerCase()));
        })
        .sort((a, b) => sortMode === "scoreDesc" ? b.similarityScore - a.similarityScore : a.similarityScore - b.similarityScore);

    const chartData = matches.slice(0, 5).map((m) => ({
        name: m.jobTitle.length > 18 ? m.jobTitle.slice(0, 18) + "…" : m.jobTitle,
        score: m.similarityScore,
    }));

    const topScore = matches[0]?.similarityScore ?? 0;
    const avgScore = matches.length ? Math.round(matches.reduce((s, m) => s + m.similarityScore, 0) / matches.length) : 0;

    return (
        <div className="main-gradient min-h-screen">
            <Navbar />
            <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Header */}
                <section className="mb-6">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Top Job Matches</h1>
                    <p className="mt-2 text-slate-600">
                        Transparent ranking based on TF-IDF weighted cosine similarity.
                        <UITooltip content="Match Score = Cosine Similarity × 100. Uses TF-IDF vectorization of your resume vs job description text.">
                            <button className="ml-2 inline-flex items-center gap-1 text-xs text-indigo-600 underline decoration-dashed hover:text-indigo-800">
                                <Info className="h-3.5 w-3.5" /> How scores work
                            </button>
                        </UITooltip>
                    </p>
                    {result && (
                        <p className="mt-1 text-sm text-slate-500">
                            Resume: <span className="font-medium text-slate-700">{result.candidateName}</span>
                            {result.targetRole && <> · {result.targetRole}</>}
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{result.algorithm}</span>
                        </p>
                    )}
                </section>

                {/* Summary stats + chart */}
                {!isLoading && matches.length > 0 && (
                    <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.5fr]">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="text-center">
                                <TrendingUp className="mx-auto h-5 w-5 text-indigo-600" />
                                <p className="mt-2 text-3xl font-bold text-slate-900">{topScore}%</p>
                                <p className="text-xs text-slate-500">Top match score</p>
                            </Card>
                            <Card className="text-center">
                                <Target className="mx-auto h-5 w-5 text-emerald-600" />
                                <p className="mt-2 text-3xl font-bold text-slate-900">{avgScore}%</p>
                                <p className="text-xs text-slate-500">Average score</p>
                            </Card>
                            <Card className="col-span-2 text-center">
                                <p className="text-2xl font-bold text-slate-900">{matches.length}</p>
                                <p className="text-xs text-slate-500">Jobs matched (top 5)</p>
                            </Card>
                        </div>

                        {/* Bar chart */}
                        <Card>
                            <p className="mb-3 text-sm font-semibold text-slate-700">Score Comparison</p>
                            <ResponsiveContainer width="100%" height={140}>
                                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        formatter={(value: number) => [`${value}%`, "Score"]}
                                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                    />
                                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, i) => (
                                            <Cell key={i} fill={SCORE_COLORS(entry.score)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </section>
                )}

                {/* Filters */}
                {!isLoading && matches.length > 0 && (
                    <Card className="mb-6">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[180px]">
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Filter by skill</label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={skillQuery}
                                        onChange={(e) => setSkillQuery(e.target.value)}
                                        placeholder="e.g. React, Python..."
                                        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 min-w-[180px]">
                                <label className="mb-1.5 block text-sm text-slate-700">Minimum score: {minScore}%</label>
                                <input type="range" min={0} max={90} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full accent-indigo-600" />
                            </div>
                            <div className="flex items-center gap-2">
                                <ArrowUpDown className="h-4 w-4 text-slate-400" />
                                <select
                                    value={sortMode}
                                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                >
                                    <option value="scoreDesc">Highest first</option>
                                    <option value="scoreAsc">Lowest first</option>
                                </select>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Match cards */}
                <section className="space-y-4">
                    {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => <MatchCardSkeleton key={i} />)
                        : error
                            ? (
                                <Card className="flex items-center gap-3 border-red-200 bg-red-50">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </Card>
                            )
                            : visibleMatches.map((match, index) => (
                                <Card key={match.jobId} hover>
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">#{match.rank ?? index + 1}</span>
                                                {match.similarityScore >= 80 && <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">Strong Match</span>}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold text-slate-900">{match.jobTitle}</h3>
                                                <p className="text-sm text-slate-500">{match.company}</p>
                                            </div>
                                            {match.explanation && (
                                                <p className="text-sm text-slate-600 italic">"{match.explanation}"</p>
                                            )}
                                            <div>
                                                <p className="text-xs font-medium text-slate-500 mb-1.5">Matched skills</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {match.matchedSkills.map((skill) => (
                                                        <span key={skill} className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">{skill}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            {match.missingSkills && match.missingSkills.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 mb-1.5">Skills to develop</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {match.missingSkills.map((skill) => (
                                                            <span key={skill} className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">{skill}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-[220px] space-y-3 lg:text-right">
                                            <CircularScore value={match.similarityScore} className="mx-auto lg:mx-0 lg:ml-auto" />
                                            <ProgressBar value={match.similarityScore} label="Similarity score" />
                                            <Button variant="secondary" className="w-full" asChild>
                                                <Link href={`/jobs/${match.jobId}`}>View Job Details</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}

                    {!isLoading && !error && visibleMatches.length === 0 && matches.length > 0 && (
                        <Card className="text-center py-12">
                            <p className="text-lg font-semibold text-slate-900">No matches pass your filters</p>
                            <p className="mt-2 text-sm text-slate-600">Lower the minimum score or clear the skill filter.</p>
                            <Button className="mt-4" variant="secondary" onClick={() => { setMinScore(0); setSkillQuery(""); }}>Reset filters</Button>
                        </Card>
                    )}

                    {!isLoading && !error && matches.length === 0 && (
                        <Card className="text-center py-16">
                            <p className="text-xl font-semibold text-slate-900">No matches computed yet</p>
                            <p className="mt-2 text-sm text-slate-600">Upload your resume on the dashboard to get your top 5 job matches.</p>
                            <Button className="mt-4" asChild><Link href="/dashboard">Go to Dashboard</Link></Button>
                        </Card>
                    )}
                </section>
            </main>
        </div>
    );
}
