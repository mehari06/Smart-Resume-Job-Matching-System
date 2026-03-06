"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Shield, Upload, FileText, Trash2, TrendingUp, Briefcase, Users, BarChart2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FileUpload } from "../../components/FileUpload";
import { Navbar } from "../../components/Navbar";
import { Skeleton } from "../../components/Skeleton";

const DEMO_RESUMES = [
  { id: "resume-001", fileName: "abebe_girma_resume.pdf", uploadedAt: "2026-03-01", targetRole: "Full Stack Developer", skills: ["React", "Node.js", "TypeScript"] },
  { id: "resume-002", fileName: "mekdes_tadesse_resume.pdf", uploadedAt: "2026-03-02", targetRole: "Data Scientist", skills: ["Python", "NLP", "scikit-learn"] },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasFile, setHasFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [activeResumeId, setActiveResumeId] = useState<string>("resume-001");
  const [isUploading, setIsUploading] = useState(false);

  const user = session?.user as any;

  const handleAnalyze = () => {
    if (!activeResumeId) return;
    startTransition(() => {
      router.push(`/matches?resumeId=${activeResumeId}`);
    });
  };

  const handleUpload = async (file: File) => {
    setHasFile(true);
    setUploadedFileName(file.name);
    setIsUploading(true);
    // Simulate upload + parsing delay
    await new Promise((r) => setTimeout(r, 1200));
    setIsUploading(false);
    const fakeId = `resume-${Date.now()}`;
    setActiveResumeId(fakeId);
    toast.success(`${file.name} uploaded successfully!`, { description: "Your resume is ready for matching." });
  };

  return (
    <div className="main-gradient min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Welcome header */}
        <div className="mb-8">
          {status === "loading" ? (
            <Skeleton className="h-9 w-72" />
          ) : (
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {session ? `Welcome back, ${user?.name?.split(" ")[0] ?? "there"} 👋` : "Job Seeker Dashboard"}
            </h1>
          )}
          <p className="mt-2 text-slate-600">Upload your resume and discover your top 5 matching jobs with explainable AI scores.</p>
        </div>

        {/* Stats row */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Resumes Uploaded", value: DEMO_RESUMES.length, icon: FileText, color: "text-indigo-600" },
            { label: "Jobs Matched", value: "5", icon: Briefcase, color: "text-emerald-600" },
            { label: "Top Match Score", value: "97%", icon: TrendingUp, color: "text-purple-600" },
            { label: "Total Jobs", value: "22+", icon: Users, color: "text-amber-600" },
          ].map((stat) => (
            <Card key={stat.label} className="flex items-center gap-4">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left: Upload + Analyze */}
          <div className="space-y-5">
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Upload className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-semibold text-slate-900">Upload Resume</h2>
              </div>
              <FileUpload
                onFileAccepted={(file) => handleUpload(file)}
              />
              {isUploading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-indigo-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading and parsing resume…
                </div>
              )}
              {uploadedFileName && !isUploading && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{uploadedFileName}</span> ready for analysis
                </div>
              )}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                Your resume is encrypted in transit. Only you can access this session.
              </div>
              <Button
                className="mt-5 w-full"
                size="lg"
                disabled={!activeResumeId || isPending}
                onClick={handleAnalyze}
                loading={isPending}
              >
                {isPending ? "Loading matches…" : "Analyze & Find My Jobs"}
                <BarChart2 className="h-4 w-4" />
              </Button>
            </Card>

            {/* Quick actions */}
            <Card>
              <h3 className="text-base font-semibold text-slate-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/jobs">Browse All Jobs</Link>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/matches?resumeId=${activeResumeId}`}>View My Matches</Link>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/profile">Edit Profile</Link>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/jobs?category=Engineering">Engineering Jobs</Link>
                </Button>
              </div>
            </Card>
          </div>

          {/* Right: Resume list */}
          <div className="space-y-5">
            <Card>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Resumes</h2>
              <div className="space-y-3">
                {DEMO_RESUMES.map((resume) => (
                  <div
                    key={resume.id}
                    onClick={() => setActiveResumeId(resume.id)}
                    className={`cursor-pointer rounded-xl border-2 p-3 transition ${activeResumeId === resume.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className={`h-4 w-4 flex-shrink-0 ${activeResumeId === resume.id ? "text-indigo-600" : "text-slate-400"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{resume.fileName}</p>
                          <p className="text-xs text-slate-500">{resume.targetRole} · {resume.uploadedAt}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toast.success("Resume deleted"); }}
                        className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {resume.skills.slice(0, 3).map((s) => (
                        <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {DEMO_RESUMES.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No resumes yet. Upload one to get started.</p>
                )}
              </div>
            </Card>

            <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
              <h3 className="font-semibold text-slate-900 text-sm">💡 Pro Tip</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Upload a resume with clearly listed skills. The TF-IDF engine scores keyword overlap with job descriptions — more specific skills = better matches.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
