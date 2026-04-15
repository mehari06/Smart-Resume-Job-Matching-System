"use client";

import { useState, useEffect, useTransition } from "react";
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
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useResumes } from "../../hooks/useResumes";
import { useQueryClient } from "@tanstack/react-query";
import { withCsrfHeaders } from "../../lib/client-security";

// Removed static DEMO_RESUMES

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasFile, setHasFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const user = session?.user as any;
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const { data: resumes = [], isLoading: isResumesLoading } = useResumes(user?.id);

  // Fetch the real-time approval status from the DB
  useEffect(() => {
    if (status === "authenticated" && user?.role === "ADMIN") {
      router.replace("/admin/dashboard");
      return;
    }

    if (status === "authenticated" && user?.id) {
      fetch("/api/recruiter/request-access")
        .then(res => res.json())
        .then(data => {
          if (data.approvalStatus) setRequestStatus(data.approvalStatus);
        })
        .catch(() => {});
    }
  }, [router, status, user?.id, user?.role]);

  const handleAnalyze = () => {
    if (!activeResumeId) return;
    startTransition(() => {
      router.push(`/matches?resumeId=${activeResumeId}`);
    });
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadedFileName(file.name);
    try {
      // 1. Get signature from our API
      const signRes = await fetch("/api/cloudinary/sign", withCsrfHeaders({ method: "POST" }));
      const signData = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        throw new Error(signData?.error ?? "Failed to get Cloudinary signature");
      }

      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signData.apiKey);
      formData.append("timestamp", signData.timestamp);
      formData.append("signature", signData.signature);
      formData.append("folder", signData.folder);
      formData.append("public_id", signData.publicId);
      formData.append("type", signData.uploadType);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/raw/upload`,
        { method: "POST", body: formData }
      );
      const cloudData = await cloudRes.json().catch(() => ({}));
      if (!cloudRes.ok || typeof cloudData?.secure_url !== "string") {
        throw new Error(cloudData?.error?.message ?? "Cloudinary upload failed");
      }

      // 3. Save resume metadata + send original file to server for reliable local parsing
      const payload = new FormData();
      payload.append("file", file);
      payload.append("userId", String(user?.id ?? ""));
      payload.append("fileName", file.name);
      payload.append("fileUrl", cloudData.secure_url);
      payload.append("filePublicId", cloudData.public_id);
      payload.append("skills", JSON.stringify([]));
      payload.append("targetRole", "Analyzing...");

      const dbRes = await fetch("/api/resumes", withCsrfHeaders({
        method: "POST",
        body: payload,
      }));
      const dbData = await dbRes.json().catch(() => ({}));
      if (!dbRes.ok || !dbData?.data?.id) {
        throw new Error(dbData?.error ?? "Failed to save resume");
      }

      // 4. Update UI
      queryClient.invalidateQueries({ queryKey: ["resumes", user?.id] });
      setActiveResumeId(dbData.data.id);
      toast.success(`${file.name} uploaded successfully!`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Upload failed (network)");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/resumes/${id}`, withCsrfHeaders({ method: "DELETE" }));
      if (res.ok) {
        toast.success("Resume deleted");
        queryClient.invalidateQueries({ queryKey: ["resumes", user?.id] });
        if (activeResumeId === id) setActiveResumeId(null);
      }
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const handleRequestRecruiter = async () => {
    try {
      const res = await fetch("/api/recruiter/request-access", withCsrfHeaders({ method: "POST" }));
      const data = await res.json();
      if (res.ok) {
        toast.success("Recruiter access requested successfully");
        setRequestStatus(data.status);
        // Redirect to the waiting page
        router.push("/recruiter-pending");
      } else {
        // If already pending, also redirect to the waiting page
        if (data.error?.includes("already") || requestStatus === "PENDING") {
          router.push("/recruiter-pending");
        } else {
          toast.error(data.error || "Failed to request access");
        }
      }
    } catch (e) {
      toast.error("Failed to request access");
    }
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

        <div className="mb-8 grid gap-4 items-center">
           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {[
              { label: "Resumes Uploaded", value: resumes.length, icon: FileText, color: "text-indigo-600" },
              { label: "Jobs Matched", value: "232", icon: Briefcase, color: "text-emerald-600" },
              { label: "AI Matching", value: "Active", icon: TrendingUp, color: "text-purple-600" },
              { label: "Market Verified", value: "Yes", icon: Users, color: "text-amber-600" },
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
                maxSize={10 * 1024 * 1024}
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
              {user?.role === "SEEKER" && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-600 mb-2">Want to post jobs instead?</p>
                  {requestStatus === "APPROVED" ? (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">
                      <p className="font-semibold mb-1">🎉 You've been approved!</p>
                      <p>Please log out and log back in to activate your recruiter dashboard.</p>
                    </div>
                  ) : requestStatus === "PENDING" ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
                      <p className="font-semibold mb-1">⏳ Request Under Review</p>
                      <p className="mb-2">An admin is reviewing your recruiter application.</p>
                      <button
                        onClick={() => router.push("/recruiter-pending")}
                        className="text-amber-700 underline underline-offset-2 hover:text-amber-900 font-medium"
                      >
                        View status →
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full relative"
                      onClick={handleRequestRecruiter}
                    >
                      Request Recruiter Access
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Right: Resume list */}
          <div className="space-y-5">
            <Card>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Resumes</h2>
              {isResumesLoading ? (
                <Skeleton className="h-20 w-full rounded-xl" />
              ) : Array.isArray(resumes) && resumes.map((resume: any) => (
                <div
                  key={resume.id}
                  onClick={() => {
                    setActiveResumeId(resume.id);
                  }}
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
                        <p className="text-xs text-slate-500">{resume.targetRole} · {new Date(resume.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <ConfirmDialog
                      title="Delete Resume?"
                      description={`Are you sure you want to delete ${resume.fileName}? This will also remove any saved match processing scores.`}
                      onConfirm={() => handleDelete(resume.id)}
                      triggerElement={
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {resume.skills?.slice(0, 6).map((s: string) => (
                      <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
              {(!resumes || resumes.length === 0) && !isResumesLoading && (
                <p className="text-sm text-slate-500 text-center py-4">No resumes yet. Upload one to get started.</p>
              )}
            </Card>

            <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
              <h3 className="font-semibold text-slate-900 text-sm">💡 Pro Tip</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Upload a detailed resume including your projects and role responsibilities. Our AI system will compare your unique profile against the job market to find your perfect professional fit.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
