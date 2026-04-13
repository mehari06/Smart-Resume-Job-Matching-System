"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { Navbar } from "../../../../components/Navbar";
import { Card } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { FileUpload } from "../../../../components/FileUpload";
import { toast } from "sonner";
import type { Job } from "../../../../types";
import { withCsrfHeaders } from "../../../../lib/client-security";

export default function ApplyJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push(`/login?callbackUrl=/jobs/${params.id}/apply`);
    },
  });

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [applicantName, setApplicantName] = useState("");
  const [email, setEmail] = useState("");
  const [resumeType, setResumeType] = useState<"file" | "url">("file");
  const [resumeURL, setResumeURL] = useState("");
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setApplicantName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session]);

  const loadJob = async () => {
    try {
      const res = await fetch(`/api/jobs?search=${params.id}`);
      const data = await res.json();
      const foundJob = Array.isArray(data.data) ? data.data.find((j: any) => j.id === params.id) : null;
      if (foundJob) {
        setJob(foundJob);
      } else {
        toast.error("Job not found");
        router.push("/jobs");
      }
    } catch {
      toast.error("Failed to load job details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [params.id]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const signRes = await fetch("/api/cloudinary/sign", withCsrfHeaders({ method: "POST" }));
      const signData = await signRes.json();
      if (!signRes.ok) {
        throw new Error(signData?.error ?? "Failed to get upload signature");
      }

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
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok || typeof cloudData?.secure_url !== "string") {
        throw new Error(cloudData?.error?.message ?? "Cloudinary upload failed");
      }

      setResumeURL(cloudData.secure_url);
      setResumeType("file");
      toast.success("Resume uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !email || !resumeURL) {
      toast.error("Please fill in all required fields and provide a resume");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${params.id}/apply`, {
        ...withCsrfHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantName, email, resumeURL }),
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      setIsSuccess(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Application failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="main-gradient min-h-screen">
        <Navbar />
        <main className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </main>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="main-gradient min-h-screen">
        <Navbar />
        <main className="mx-auto flex w-full max-w-2xl px-4 py-16 items-center justify-center">
          <Card className="text-center py-16 px-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Application Submitted!</h1>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Your application for <span className="font-semibold">{job?.title}</span> at <span className="font-semibold">{job?.company}</span> has been sent successfully.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="secondary">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/jobs">Browse More Jobs</Link>
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="main-gradient min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href={`/jobs/${params.id}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Job Details
        </Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Apply for Role</h1>
          {job && (
            <p className="mt-2 text-lg text-slate-600">
              <span className="font-semibold text-indigo-700">{job.title}</span> at {job.company}
            </p>
          )}
        </div>

        <Card className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <input
                  required
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Resume</label>
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setResumeType("file")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${resumeType === "file" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setResumeType("url")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${resumeType === "url" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Paste URL
                  </button>
                </div>
              </div>

              {resumeType === "file" ? (
                <div>
                  <FileUpload onFileAccepted={handleFileUpload} />
                  {resumeURL && resumeType === "file" && (
                    <p className="mt-2 text-sm text-emerald-600 font-medium">✓ Resume uploaded ready.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    required
                    type="url"
                    value={resumeURL}
                    onChange={(e) => setResumeURL(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="https://link-to-your-resume.pdf"
                  />
                  <p className="text-xs text-slate-500">Must be a publicly accessible link to your resume document.</p>
                </div>
              )}
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                size="lg"
                className="w-full text-base font-semibold py-6 shadow-md shadow-indigo-500/20"
                disabled={isSubmitting || isUploading || !resumeURL}
                loading={isSubmitting}
              >
                {isSubmitting ? "Submitting Application..." : "Submit Application"}
                {!isSubmitting && <Send className="ml-2 h-5 w-5" />}
              </Button>
              <p className="mt-4 text-center text-xs text-slate-500">
                By submitting this application, you agree to our terms of service and privacy policy.
              </p>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
