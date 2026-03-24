"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, Briefcase, FileText, BarChart, Plus, SlidersHorizontal, Sparkles, AlertCircle, Pencil, Trash2, RefreshCw, Save, X, Eye, Download } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CircularScore } from "../../components/CircularScore";
import { toast } from "sonner";
import Link from "next/link";
import type { Job } from "../../types";

type RecruiterJob = Job;

type EditableJob = {
  title: string;
  company: string;
  location: string;
  category: string;
  type: Job["type"];
  salary: string;
  description: string;
  experience: string;
  skillsText: string;
};

const JOB_TYPE_OPTIONS: Job["type"][] = ["Full-time", "Part-time", "Contract", "Remote", "Research Contract"];

type JobCandidate = {
  matchId: string;
  score: number;
  rank?: number;
  matchedSkills: string[];
  missingSkills: string[];
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    age?: number;
    education?: string;
    fieldOfStudy?: string;
    isStudent?: boolean;
  };
  resume: {
    id: string;
    fileName: string;
    fileUrl: string;
    targetRole?: string;
    experienceYears?: number;
  };
};

export default function RecruiterPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [minScore, setMinScore] = useState(40);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditableJob | null>(null);
  const [selectedJobForCandidates, setSelectedJobForCandidates] = useState<string | null>(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [candidates, setCandidates] = useState<JobCandidate[]>([]);

  const totalApplicants = useMemo(
    () => jobs.reduce((sum, job) => sum + (job.applicants ?? 0), 0),
    [jobs]
  );

  const avgMatch = useMemo(() => {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, candidate) => sum + (candidate.matchScore ?? 0), 0);
    return Math.round(total / results.length);
  }, [results]);

  const fetchOwnedJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch("/api/jobs?mine=true", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load your jobs");
      }
      setJobs(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load jobs");
      setJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchOwnedJobs();
  }, []);

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

  const startEditingJob = (job: RecruiterJob) => {
    setEditingJobId(job.id);
    setEditDraft({
      title: job.title,
      company: job.company,
      location: job.location,
      category: job.category,
      type: job.type,
      salary: job.salary ?? "",
      description: job.description,
      experience: job.experience,
      skillsText: (job.skills ?? []).join(", "),
    });
  };

  const cancelEditing = () => {
    setEditingJobId(null);
    setEditDraft(null);
  };

  const saveJob = async (jobId: string) => {
    if (!editDraft) return;

    const payload = {
      title: editDraft.title.trim(),
      company: editDraft.company.trim(),
      location: editDraft.location.trim(),
      category: editDraft.category.trim(),
      type: editDraft.type,
      salary: editDraft.salary.trim(),
      description: editDraft.description.trim(),
      experience: editDraft.experience.trim(),
      skills: editDraft.skillsText
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    };

    if (!payload.title || !payload.company || !payload.description) {
      toast.error("Title, company, and description are required.");
      return;
    }

    setBusyJobId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to update job");
      }

      const updated = json.data as RecruiterJob;
      setJobs((prev) => prev.map((job) => (job.id === updated.id ? updated : job)));
      toast.success("Job updated");
      cancelEditing();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update job");
    } finally {
      setBusyJobId(null);
    }
  };

  const deleteJob = async (jobId: string, title: string) => {
    const confirmed = window.confirm(`Delete '${title}'? This cannot be undone.`);
    if (!confirmed) return;

    setBusyJobId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to delete job");
      }

      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      toast.success("Job deleted");
      if (editingJobId === jobId) {
        cancelEditing();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete job");
    } finally {
      setBusyJobId(null);
    }
  };

  const fetchCandidatesForJob = async (jobId: string) => {
    setSelectedJobForCandidates(jobId);
    setIsLoadingCandidates(true);
    try {
      const res = await fetch(`/api/recruiter/jobs/${jobId}/candidates`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load candidates");
      setCandidates(Array.isArray(json?.data?.candidates) ? json.data.candidates : []);
    } catch (error) {
      setCandidates([]);
      toast.error(error instanceof Error ? error.message : "Failed to load candidates");
    } finally {
      setIsLoadingCandidates(false);
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
              <p className="text-2xl font-bold text-slate-900">{jobs.length}</p>
              <p className="text-xs text-slate-500">Active Jobs</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalApplicants}</p>
              <p className="text-xs text-slate-500">Total Applicants</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <BarChart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{avgMatch}%</p>
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
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Your Active Jobs</h2>
                <Button
                  variant="secondary"
                  className="text-xs"
                  onClick={fetchOwnedJobs}
                  disabled={isLoadingJobs}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingJobs ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
              <div className="space-y-3">
                {isLoadingJobs && (
                  <p className="text-sm text-slate-500">Loading your jobs...</p>
                )}

                {!isLoadingJobs && jobs.length === 0 && (
                  <div className="rounded-xl border border-slate-100 p-3 text-sm text-slate-500">
                    No saved jobs yet. Post your first job to manage it here.
                  </div>
                )}

                {!isLoadingJobs && jobs.map((job) => {
                  const isEditing = editingJobId === job.id && editDraft;
                  const isBusy = busyJobId === job.id;

                  return (
                    <div key={job.id} className="rounded-xl border border-slate-100 p-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={editDraft.title}
                            onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Job title"
                          />
                          <input
                            value={editDraft.company}
                            onChange={(e) => setEditDraft({ ...editDraft, company: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Company"
                          />
                          <textarea
                            value={editDraft.description}
                            onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            rows={4}
                            placeholder="Description"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={editDraft.location}
                              onChange={(e) => setEditDraft({ ...editDraft, location: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              placeholder="Location"
                            />
                            <input
                              value={editDraft.category}
                              onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              placeholder="Category"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={editDraft.type}
                              onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value as Job["type"] })}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              {JOB_TYPE_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            <input
                              value={editDraft.experience}
                              onChange={(e) => setEditDraft({ ...editDraft, experience: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              placeholder="Experience"
                            />
                          </div>
                          <input
                            value={editDraft.salary}
                            onChange={(e) => setEditDraft({ ...editDraft, salary: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Salary"
                          />
                          <input
                            value={editDraft.skillsText}
                            onChange={(e) => setEditDraft({ ...editDraft, skillsText: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Skills (comma separated)"
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" disabled={isBusy} onClick={cancelEditing}>
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                            <Button disabled={isBusy} onClick={() => saveJob(job.id)}>
                              <Save className="h-4 w-4" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                            <span>{job.company}</span>
                            <span className="font-medium text-indigo-600">{job.type}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="secondary" className="text-xs" asChild>
                              <Link href={`/jobs/${job.id}`}>View</Link>
                            </Button>
                            <Button
                              variant="secondary"
                              className="text-xs"
                              disabled={isBusy}
                              onClick={() => startEditingJob(job)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              className="text-xs bg-red-600 hover:bg-red-700"
                              disabled={isBusy}
                              onClick={() => deleteJob(job.id, job.title)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                            <Button
                              variant="secondary"
                              className="text-xs"
                              disabled={isBusy}
                              onClick={() => fetchCandidatesForJob(job.id)}
                            >
                              <Users className="h-3.5 w-3.5" />
                              Applicants
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-xs" asChild>
                <Link href="/jobs/new">Post Another Job</Link>
              </Button>
            </Card>

            {selectedJobForCandidates && (
              <Card>
                <h3 className="text-sm font-semibold text-slate-900">
                  Applicants Ranked By Match Score
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Sorted descending for selected job.
                </p>

                <div className="mt-3 space-y-3">
                  {isLoadingCandidates && <p className="text-xs text-slate-500">Loading candidates...</p>}
                  {!isLoadingCandidates && candidates.length === 0 && (
                    <p className="text-xs text-slate-500">No scored applicants yet for this job.</p>
                  )}

                  {!isLoadingCandidates &&
                    candidates.map((candidate) => (
                      <div key={candidate.matchId} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            {candidate.user.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={candidate.user.image} alt={candidate.user.name ?? "candidate"} className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                {(candidate.user.firstName?.[0] ?? candidate.user.name?.[0] ?? "U").toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {candidate.user.firstName || candidate.user.lastName
                                  ? `${candidate.user.firstName ?? ""} ${candidate.user.lastName ?? ""}`.trim()
                                  : candidate.user.name ?? "Candidate"}
                              </p>
                              <p className="text-xs text-slate-500">{candidate.user.email}</p>
                              <p className="text-xs text-slate-500">
                                {candidate.user.city ?? "City N/A"}
                                {typeof candidate.user.age === "number" ? ` · ${candidate.user.age} yrs` : ""}
                              </p>
                              <p className="text-xs text-slate-500">
                                {candidate.user.education ?? "Education N/A"}
                                {candidate.user.fieldOfStudy ? ` · ${candidate.user.fieldOfStudy}` : ""}
                                {candidate.user.isStudent ? " · Student" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-indigo-700">{candidate.score.toFixed(2)}%</p>
                            <p className="text-[10px] uppercase tracking-wide text-slate-500">Match Score</p>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {candidate.matchedSkills.slice(0, 4).map((skill) => (
                            <span key={`${candidate.matchId}-${skill}`} className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="mt-2 flex gap-2">
                          <a href={candidate.resume.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                            <Eye className="h-3.5 w-3.5" />
                            Preview Resume
                          </a>
                          <a href={candidate.resume.fileUrl} download className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900">
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}

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
