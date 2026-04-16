"use client";

import { useEffect, useMemo, useState } from "react";
import { Upload, FileText, TrendingUp, Send } from "lucide-react";
import { Button } from "./Button";
import { toast } from "sonner";
import { withCsrfHeaders } from "../lib/client-security";

type ResumeItem = {
    id: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    targetRole?: string;
};

type ApplyResult = {
    submitted?: boolean;
    targetJob: {
        jobId?: string;
        jobTitle: string;
        company: string;
        similarityScore: number;
        rank: number;
        isTopMatch: boolean;
        missingSkills?: string[];
    };
    recommendations: Array<{
        jobId?: string;
        jobTitle: string;
        company: string;
        similarityScore: number;
    }>;
    algorithm: string;
};

type Props = {
    jobId: string;
};

export function JobApplyPanel({ jobId }: Props) {
    const [resumes, setResumes] = useState<ResumeItem[]>([]);
    const [selectedResumeId, setSelectedResumeId] = useState("");
    const [isLoadingResumes, setIsLoadingResumes] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isCheckingScore, setIsCheckingScore] = useState(false);
    const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
    const [result, setResult] = useState<ApplyResult | null>(null);

    const selectedResume = useMemo(
        () => resumes.find((r) => r.id === selectedResumeId),
        [resumes, selectedResumeId]
    );

    async function loadResumes() {
        setIsLoadingResumes(true);
        try {
            const res = await fetch("/api/resumes", { cache: "no-store" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? "Failed to load resumes");
            const items = Array.isArray(json.data) ? json.data : [];
            setResumes(items);
            if (!selectedResumeId && items.length > 0) {
                setSelectedResumeId(items[0].id);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to load resumes");
        } finally {
            setIsLoadingResumes(false);
        }
    }

    useEffect(() => {
        loadResumes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function uploadResume(file: File) {
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

            const payload = new FormData();
            payload.append("file", file);
            payload.append("fileName", file.name);
            payload.append("fileUrl", cloudData.secure_url);
            payload.append("filePublicId", cloudData.public_id);
            payload.append("skills", JSON.stringify([]));
            payload.append("targetRole", "Analyzing...");

            const saveRes = await fetch("/api/resumes", {
                ...withCsrfHeaders({
                method: "POST",
                body: payload,
                }),
            });
            const saveJson = await saveRes.json();
            if (!saveRes.ok || !saveJson?.data?.id) {
                throw new Error(saveJson?.error ?? "Failed to save resume");
            }

            const createdResume = saveJson.data as ResumeItem;
            setResumes((current) => {
                if (current.some((resume) => resume.id === createdResume.id)) {
                    return current;
                }
                return [createdResume, ...current];
            });
            setSelectedResumeId(createdResume.id);
            void loadResumes();
            toast.success("Resume uploaded. You can now apply to this job.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Upload failed");
        } finally {
            setIsUploading(false);
        }
    }

    async function checkScoreOnly() {
        if (!selectedResumeId) {
            toast.error("Select or upload a resume first.");
            return;
        }
        setIsCheckingScore(true);
        setResult(null);
        try {
            const res = await fetch(`/api/jobs/${jobId}/apply`, {
                ...withCsrfHeaders({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resumeId: selectedResumeId, submit: false }),
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json?.error ?? "Failed to check score");
            }
            setResult(json.data as ApplyResult);
            toast.success("Score checked successfully.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Score check failed");
        } finally {
            setIsCheckingScore(false);
        }
    }

    async function submitApplication() {
        if (!selectedResumeId) {
            toast.error("Select or upload a resume first.");
            return;
        }
        if (!result) {
            toast.error("Please check score first.");
            return;
        }
        setIsSubmittingApplication(true);
        try {
            const res = await fetch(`/api/jobs/${jobId}/apply`, {
                ...withCsrfHeaders({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resumeId: selectedResumeId, submit: true }),
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json?.error ?? "Failed to submit application");
            }
            setResult(json.data as ApplyResult);
            toast.success("Application submitted.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Submit failed");
        } finally {
            setIsSubmittingApplication(false);
        }
    }

    return (
        <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Apply With Your Resume</p>
            <p className="text-xs text-slate-500">
                Upload/select a resume and we will score this specific job against your profile.
            </p>

            <label className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 cursor-pointer hover:bg-slate-100 transition">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <Upload className="h-3.5 w-3.5" />
                    {isUploading ? "Uploading..." : "Upload New Resume"}
                </span>
                <input
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadResume(file);
                        e.currentTarget.value = "";
                    }}
                />
            </label>

            <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                disabled={isLoadingResumes}
            >
                {isLoadingResumes && <option>Loading resumes...</option>}
                {!isLoadingResumes && resumes.length === 0 && <option value="">No resumes yet</option>}
                {!isLoadingResumes &&
                    resumes.map((resume) => (
                        <option key={resume.id} value={resume.id}>
                            {resume.fileName}
                        </option>
                    ))}
            </select>

            <Button
                className="w-full"
                onClick={checkScoreOnly}
                loading={isCheckingScore}
                disabled={!selectedResumeId || isUploading}
            >
                {isCheckingScore ? "Checking Score..." : "Check Match Score"}
                <TrendingUp className="h-4 w-4" />
            </Button>
            <Button
                variant="secondary"
                className="w-full"
                onClick={submitApplication}
                loading={isSubmittingApplication}
                disabled={!selectedResumeId || isUploading || !result}
            >
                {isSubmittingApplication ? "Submitting..." : "Apply For This Job"}
                <Send className="h-4 w-4" />
            </Button>

            {selectedResume && (
                <a
                    href={selectedResume.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                >
                    <FileText className="h-3.5 w-3.5" />
                    Preview selected resume
                </a>
            )}

            {result && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                    <p className="font-semibold text-slate-900">
                        Score for this job: {result.targetJob.similarityScore.toFixed(2)}%
                    </p>
                    {result.targetJob.isTopMatch ? (
                        <p className="mt-1 text-emerald-700">This is your current top match.</p>
                    ) : (
                        <p className="mt-1 text-amber-700">
                            This is not your top match right now. We listed better-fit recommendations below.
                        </p>
                    )}

                    <p className="mt-2 text-xs text-slate-500">
                        Status: {result.submitted ? "Applied" : "Score checked (not applied yet)"}
                    </p>

                    {result.targetJob.missingSkills && result.targetJob.missingSkills.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs font-medium text-slate-500">Missing skills (heuristic)</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {result.targetJob.missingSkills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {result.recommendations.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-medium text-slate-500">Recommended alternatives</p>
                            <div className="mt-1 space-y-1">
                                {result.recommendations.slice(0, 3).map((item) => (
                                    <p key={`${item.jobId}-${item.jobTitle}`} className="text-xs text-slate-700">
                                        {item.jobTitle} ({item.similarityScore.toFixed(2)}%)
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
