"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Info, Search } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { CircularScore } from "../../components/CircularScore";
import { Navbar } from "../../components/Navbar";
import { ProgressBar } from "../../components/ProgressBar";
import { Skeleton } from "../../components/Skeleton";
import { Tooltip } from "../../components/Tooltip";
import { useAppState } from "../../components/AppStateProvider";
import { jobMatches, resumeSummary } from "../../lib/mockData";

type SortMode = "scoreDesc" | "scoreAsc";

export default function ResultsPage() {
  const { state } = useAppState();
  const [sortMode, setSortMode] = useState<SortMode>("scoreDesc");
  const [isLoading, setIsLoading] = useState(true);
  const [skillQuery, setSkillQuery] = useState("");
  const [minScore, setMinScore] = useState(60);
  const deferredSkillQuery = useDeferredValue(skillQuery.trim().toLowerCase());

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const visibleMatches = useMemo(() => {
    const filtered = jobMatches.filter((job) => {
      if (job.similarityScore < minScore) return false;
      if (!deferredSkillQuery) return true;
      return job.matchedSkills.some((skill) => skill.toLowerCase().includes(deferredSkillQuery));
    });

    return filtered.sort((a, b) =>
      sortMode === "scoreDesc"
        ? b.similarityScore - a.similarityScore
        : a.similarityScore - b.similarityScore
    );
  }, [sortMode, deferredSkillQuery, minScore]);

  return (
    <div className="main-gradient min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Top 5 Job Matches</h1>
            <p className="mt-2 text-slate-600">Transparent ranking based on TF-IDF weighted cosine similarity.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-600">
            Active role: {state.role === "jobSeeker" ? "Job Seeker" : "Recruiter"}
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Resume Summary</h2>
                <p className="text-sm text-slate-600">
                  {resumeSummary.candidateName} - {resumeSummary.targetRole} ({resumeSummary.experienceYears} years)
                </p>
                {state.uploadedResumeName ? (
                  <p className="mt-1 text-sm text-indigo-700">Matched from: {state.uploadedResumeName}</p>
                ) : null}
              </div>
              <Tooltip content="Score uses TF-IDF weighting and cosine similarity between resume and job description vectors.">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                  How score is calculated
                </button>
              </Tooltip>
            </div>
            <p className="mt-3 text-sm text-slate-600">{resumeSummary.strongestMatchReason}</p>
          </Card>

          <Card className="space-y-3">
            <label htmlFor="skill-search" className="text-sm font-medium text-slate-700">
              Filter by matched skill
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="skill-search"
                type="text"
                value={skillQuery}
                onChange={(event) => setSkillQuery(event.target.value)}
                placeholder="e.g. React"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <label htmlFor="min-score" className="text-sm text-slate-700">
              Minimum score: {minScore}%
            </label>
            <input
              id="min-score"
              type="range"
              min={50}
              max={95}
              value={minScore}
              onChange={(event) => setMinScore(Number(event.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="scoreDesc">Sort by highest score</option>
                <option value="scoreAsc">Sort by lowest score</option>
              </select>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="w-full space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <Skeleton className="h-20 w-20 rounded-full" />
                  </div>
                </Card>
              ))
            : visibleMatches.map((match, index) => (
                <Card key={match.jobId} hover>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                      <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        #{index + 1}
                      </span>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{match.jobTitle}</h3>
                        <p className="text-sm text-slate-500">{match.company}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {match.matchedSkills.map((skill) => (
                          <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="min-w-[240px] space-y-3">
                      <CircularScore value={match.similarityScore} className="mx-auto" />
                      <ProgressBar value={match.similarityScore} label="Similarity score" />
                      <Button variant="secondary" className="w-full">
                        View Job
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

          {!isLoading && visibleMatches.length === 0 ? (
            <Card className="text-center">
              <h3 className="text-lg font-semibold text-slate-900">No matches found</h3>
              <p className="mt-2 text-sm text-slate-600">
                Try lowering the minimum score or using a broader skill keyword.
              </p>
            </Card>
          ) : null}
        </section>
      </main>
    </div>
  );
}
