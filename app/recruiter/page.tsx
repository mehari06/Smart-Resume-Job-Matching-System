"use client";

import { useState, useTransition } from "react";
import { Search, Users, Briefcase, FileText, BarChart, Plus, Send, SlidersHorizontal, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CircularScore } from "../../components/CircularScore";
import { toast } from "sonner";
import Link from "next/link";

export default function RecruiterPage() {
  const [isPending, startTransition] = useTransition();
  const [jobDescription, setJobDescription] = useState("");
  const [minScore, setMinScore] = useState(40);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jobDescription.length < 20) {
      toast.error("Please enter a longer job description for accurate matching.");
      return;
    }

    setIsSearching(true);
    setHasSearched(false);
    try {
      const res = await fetch("/api/recruiter/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, minScore }),
      });
      const data = await res.json();
      setResults(data.data ?? []);
      setHasSearched(true);
      toast.success(`Found ${data.total ?? 0} matching candidates`);
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="main-gradient min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Recruiter Portal</h1>
            <p className="mt-2 text-slate-600">Find the best talent using AI-powered resume parsing and matching.</p>
          </div>
          <Button asChild>
            <Link href="/jobs/new"><Plus className="h-4 w-4" /> Post New Job</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">12</p>
              <p className="text-xs text-slate-500">Active Jobs</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">452</p>
              <p className="text-xs text-slate-500">Total Applicants</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <BarChart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">82%</p>
              <p className="text-xs text-slate-500">Avg. Match Score</p>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* AI Search Tool */}
          <div className="space-y-6">
            <Card className="border-indigo-100 bg-white">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-xl font-semibold text-slate-900">AI Talent Finder</h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Min Match: {minScore}%
                </div>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Paste Job Description</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Describe the role, required skills, and responsibilities... The more detail, the better the match."
                    rows={8}
                    className="w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                  />
                  <p className="mt-1.5 text-right text-xs text-slate-400">{jobDescription.length} characters</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="range"
                      min={20}
                      max={95}
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                  <Button type="submit" size="lg" disabled={isSearching} loading={isSearching} className="w-full md:w-auto">
                    {isSearching ? "Analyzing Talent..." : "Find Best Matches"}
                    {!isSearching && <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Results Section */}
            {hasSearched && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-semibold text-slate-900">Ranked Candidates ({results.length})</h3>
                  <span className="text-xs text-slate-500">Matches based on NLP Keyword Overlap</span>
                </div>

                {results.length === 0 ? (
                  <Card className="py-12 text-center text-slate-500">
                    <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                    <p>No candidates reached the {minScore}% threshold.</p>
                    <p className="text-sm">Try lowering the minimum score or refining the description.</p>
                  </Card>
                ) : (
                  results.map((res) => (
                    <Card key={res.id} hover className="group transition-all hover:border-indigo-200">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900">{res.candidateName}</h4>
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              {res.targetRole}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">{res.education || "Bachelor's Degree"} · {res.experienceYears}yr exp</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {res.matchedSkills.slice(0, 4).map((skill: string) => (
                              <span key={skill} className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-center gap-2">
                          <CircularScore value={res.matchScore} className="scale-75" />
                          <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            View Resume <FileText className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar / Recent Jobs */}
          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Jobs</h2>
              <div className="space-y-3">
                {[
                  { title: "Senior ML Engineer", apps: 42, score: 91 },
                  { title: "React Developer", apps: 128, score: 78 },
                  { title: "Back End Dev", apps: 15, score: 65 },
                ].map((job) => (
                  <div key={job.title} className="rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition cursor-pointer">
                    <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span>{job.apps} applicants</span>
                      <span className="font-medium text-indigo-600">{job.score}% avg match</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-xs" asChild>
                <Link href="/recruiter/jobs">Manage All Jobs</Link>
              </Button>
            </Card>

            <Card className="bg-indigo-900 text-white border-none">
              <h3 className="font-semibold text-white">Advanced ML Matching</h3>
              <p className="mt-2 text-xs text-indigo-100 leading-relaxed">
                Smart Resume's ML layer will automatically rank candidates as they apply. Using TF-IDF, the system ensures you see the most relevant resumes first.
              </p>
              <Button className="mt-4 w-full bg-white/10 hover:bg-white/20 text-white border-white/20">
                Upgrade Engine <Sparkles className="h-4 w-4 ml-2" />
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
