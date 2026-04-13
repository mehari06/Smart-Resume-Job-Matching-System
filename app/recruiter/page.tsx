"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Search, Users, Briefcase, FileText, BarChart, Plus, SlidersHorizontal, Sparkles, AlertCircle, Pencil, Trash2, RefreshCw, Save, X, Eye, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CircularScore } from "../../components/CircularScore";
import { toast } from "sonner";
import Link from "next/link";
import type { Job } from "../../types";
import { withCsrfHeaders } from "../../lib/client-security";

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
const JOBS_PER_PAGE = 5;

type JobCandidate = {
  matchId: string;
  type?: "DIRECT_APPLICATION" | "ML_MATCH";
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
  const { data: session, status } = useSession();
  const user = session?.user as any;

  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditableJob | null>(null);
  const [selectedJobForCandidates, setSelectedJobForCandidates] = useState<string | null>(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [candidates, setCandidates] = useState<JobCandidate[]>([]);
  const [jobsPage, setJobsPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const totalApplicants = useMemo(
    () => jobs.reduce((sum, job) => sum + (job.applicants ?? 0), 0),
    [jobs]
  );

  const totalJobsPages = Math.ceil(jobs.length / JOBS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    const start = (jobsPage - 1) * JOBS_PER_PAGE;
    return jobs.slice(start, start + JOBS_PER_PAGE);
  }, [jobs, jobsPage]);

  const fetchOwnedJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch("/api/jobs?mine=true", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load your jobs");
      setJobs(Array.isArray(json.data) ? json.data : []);
      setJobsPage(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load jobs");
      setJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchOwnedJobs();

    const eventSource = new EventSource("/api/notifications");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_application") {
          const { application } = data;
          toast.success(`New Application! ${application.applicantName} applied for ${application.jobTitle}`, {
            duration: 8000,
            action: {
              label: "View",
              onClick: () => {
                fetchOwnedJobs();
                fetchCandidatesForJob(application.jobId);
              }
            }
          });
          fetchOwnedJobs();
          if (selectedJobForCandidates) fetchCandidatesForJob(selectedJobForCandidates);
        }
      } catch (error) {
        console.error("Error parsing notification event:", error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

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
      skills: editDraft.skillsText.split(",").map((s) => s.trim()).filter(Boolean),
    };

    setBusyJobId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        ...withCsrfHeaders({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update job");
      setJobs((prev) => prev.map((job) => (job.id === json.data.id ? json.data : job)));
      toast.success("Job updated");
      cancelEditing();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update job");
    } finally {
      setBusyJobId(null);
    }
  };

  const deleteJob = async (jobId: string, title: string) => {
    if (!window.confirm(`Delete '${title}'?`)) return;
    setBusyJobId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, withCsrfHeaders({ method: "DELETE" }));
      if (!res.ok) throw new Error("Failed to delete job");
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Job deleted");
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
      const [candRes, appRes] = await Promise.all([
        fetch(`/api/recruiter/jobs/${jobId}/candidates`),
        fetch(`/api/recruiter/jobs/${jobId}/applications`)
      ]);
      const candJson = await candRes.json();
      const appJson = await appRes.json();
      
      const mlMatches = candJson?.data?.candidates || [];
      const directApps = appJson?.data?.map((app: any) => ({
        matchId: `app-${app.id}`,
        type: "DIRECT_APPLICATION",
        user: app.user,
        resume: { id: app.id, fileName: "Resume", fileUrl: app.resumeURL }
      })) || [];

      setCandidates([...directApps, ...mlMatches]);
    } catch {
      toast.error("Failed to load candidates");
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center p-4">Loading...</div>;
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "RECRUITER")) {
    return (
      <div className="main-gradient min-h-screen">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl px-4 py-20 text-center">
          <div className="bg-white rounded-xl shadow p-12 inline-block border border-red-100">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-600 mb-6">You must be an approved recruiter to access the talent portal.</p>
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="main-gradient min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Recruiter Portal</h1>
            <p className="mt-2 text-slate-600">Managing your tech talent pipeline effortlessly.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" asChild>
              <Link href="/recruiter/applicants"><Users className="h-4 w-4" /> View All Candidates</Link>
            </Button>
            <Button asChild>
              <Link href="/jobs/new"><Plus className="h-4 w-4" /> Post New Job</Link>
            </Button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{jobs.length}</p>
              <p className="text-xs text-slate-500">Active Jobs</p>
            </div>
          </Card>
          <Link href="/recruiter/applicants">
            <Card className="flex items-center gap-4 hover:border-indigo-200 hover:shadow-lg transition-all group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalApplicants}</p>
                <p className="text-xs text-slate-500">Total Applicants</p>
              </div>
            </Card>
          </Link>
          <Card className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <BarChart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">High</p>
              <p className="text-xs text-slate-500">Hiring Activity</p>
            </div>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px] items-start">
          <div className="space-y-6">
            <Card className="border-slate-100 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your Active Jobs</h2>
                <Button variant="secondary" size="sm" onClick={fetchOwnedJobs} disabled={isLoadingJobs}>
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingJobs ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </div>
              
              <div className="space-y-3">
                {isLoadingJobs && <p className="text-sm text-slate-500 text-center py-4">Loading jobs...</p>}
                {!isLoadingJobs && jobs.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No jobs posted yet.</p>}
                {paginatedJobs.map((job) => (
                  <div key={job.id} className="rounded-xl border border-slate-100 p-3">
                    {editingJobId === job.id && editDraft ? (
                      <div className="space-y-2">
                        <input className="w-full rounded-lg border p-2 text-sm" value={editDraft.title} onChange={(e) => setEditDraft({...editDraft, title: e.target.value})} />
                        <textarea className="w-full rounded-lg border p-2 text-sm" rows={3} value={editDraft.description} onChange={(e) => setEditDraft({...editDraft, description: e.target.value})} />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={cancelEditing}>Cancel</Button>
                          <Button size="sm" onClick={() => saveJob(job.id)} disabled={busyJobId === job.id}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900">{job.title}</p>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{job.type}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" className="h-7 text-[10px]" asChild><Link href={`/jobs/${job.id}`}>View</Link></Button>
                          <Button variant="secondary" className="h-7 text-[10px]" onClick={() => startEditingJob(job)}>Edit</Button>
                          <Button variant="secondary" className="h-7 text-[10px]" onClick={() => fetchCandidatesForJob(job.id)}>Applicants</Button>
                          <Button variant="secondary" className="h-7 text-[10px] bg-red-50 text-red-600 border-red-100 hover:bg-red-100" onClick={() => deleteJob(job.id, job.title)}>Delete</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {selectedJobForCandidates && (
              <Card className="border-indigo-50 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 tracking-tight">Applicants for Position</h3>
                <div className="space-y-3">
                  {isLoadingCandidates ? <p className="text-xs text-center py-4">Loading...</p> : candidates.length === 0 ? <p className="text-xs text-center py-4">No applicants yet.</p> : candidates.map((c) => (
                    <div key={c.matchId} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/30">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {c.user.firstName?.[0] || c.user.name?.[0] || "?"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{c.user.name || `${c.user.firstName} ${c.user.lastName}`}</p>
                          <p className="text-[10px] text-slate-500">{c.user.email}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] text-indigo-600" onClick={() => setPreviewUrl(c.resume.fileUrl)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-indigo-900 text-white border-none shadow-xl shadow-indigo-500/20 p-6 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
              <div className="relative z-10 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-indigo-200" />
                  </div>
                  <h3 className="font-bold text-white tracking-tight">Advanced ML</h3>
                </div>
                <p className="text-xs text-indigo-100/90 leading-relaxed">Intelligence engine ranks talent automatically so you focus on the best candidates first.</p>
                <Button className="mt-6 w-full bg-white text-indigo-900 hover:bg-indigo-50 font-bold border-none shadow-lg">Upgrade Engine</Button>
              </div>
            </Card>

            <Card className="border-dashed border-slate-200 bg-white/50 p-6">
              <h4 className="text-sm font-bold text-slate-900 mb-2">Hiring Tip</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">Clear job descriptions decrease time-to-hire by up to 25% by attracting more relevant talent.</p>
            </Card>
          </div>
        </div>

        {previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8">
            <Card className="relative flex flex-col h-full w-full max-w-5xl shadow-2xl p-0 overflow-hidden border-indigo-100 animate-in zoom-in-95">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" /> Resume Preview</h3>
                <div className="flex items-center gap-2">
                   <Button variant="secondary" size="sm" asChild><a href={previewUrl} target="_blank" rel="noreferrer">Open Original</a></Button>
                   <Button variant="secondary" size="sm" onClick={() => setPreviewUrl(null)}><X className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex-1 bg-slate-100"><iframe src={previewUrl} className="h-full w-full border-none" title="Resume" /></div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
