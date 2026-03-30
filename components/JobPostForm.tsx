"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Briefcase, MapPin, DollarSign, Calendar, List, Layout, Send } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { toast } from "sonner";
import { ErrorMessage } from "./ErrorMessage";

const jobSchema = z.object({
    title: z.string().min(5, "Job title must be at least 5 characters"),
    company: z.string().min(2, "Company name is required"),
    location: z.string().min(2, "Location is required"),
    category: z.string().min(1, "Please select a category"),
    type: z.string().min(1, "Please select a job type"),
    salary: z.string().optional(),
    deadline: z.string().optional(),
    description: z.string().min(50, "Description must be at least 50 characters to provide enough detail"),
    skills: z.array(z.string()).min(1, "At least one required skill must be added"),
});

type JobFormValues = z.infer<typeof jobSchema>;

export function JobPostForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [skillInput, setSkillInput] = useState("");

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        watch,
        formState: { errors },
    } = useForm<JobFormValues>({
        resolver: zodResolver(jobSchema),
        defaultValues: {
            title: "",
            company: "",
            location: "",
            category: "Engineering",
            type: "Full-time",
            salary: "",
            deadline: "",
            description: "",
            skills: [],
        },
    });

    const skills = watch("skills");

    const handleAddSkill = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && skillInput.trim()) {
            e.preventDefault();
            const newSkill = skillInput.trim();
            if (!skills.includes(newSkill)) {
                setValue("skills", [...skills, newSkill], { shouldValidate: true });
                setSkillInput("");
            }
        }
    };

    const removeSkill = (s: string) => {
        setValue(
            "skills",
            skills.filter((item) => item !== s),
            { shouldValidate: true }
        );
    };

    const onSubmit = async (data: JobFormValues) => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error ?? "Failed to post job");
            }

            reset();
            setSkillInput("");
            toast.success("Job posted successfully!", { description: "Applicants will now see this matched with their resumes." });
            router.push(`/jobs/${json.data.id}`);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to post job. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-indigo-600" /> Job Details
                </h2>
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job Title</label>
                            <input
                                {...register("title")}
                                placeholder="e.g. Senior Full Stack Developer"
                                className={`w-full rounded-xl border bg-white py-2.5 px-3 text-sm outline-none transition focus:ring-2 ${errors.title ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                                    }`}
                            />
                            <ErrorMessage message={errors.title?.message} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company Name</label>
                            <input
                                {...register("company")}
                                placeholder="e.g. Afriwork"
                                className={`w-full rounded-xl border bg-white py-2.5 px-3 text-sm outline-none transition focus:ring-2 ${errors.company ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                                    }`}
                            />
                            <ErrorMessage message={errors.company?.message} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <input
                                    {...register("location")}
                                    placeholder="e.g. Addis Ababa, Remote"
                                    className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:ring-2 ${errors.location ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                                        }`}
                                />
                            </div>
                            <ErrorMessage message={errors.location?.message} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job Category</label>
                            <div className="relative">
                                <Layout className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <select
                                    {...register("category")}
                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="Engineering">Engineering</option>
                                    <option value="Data Science">Data Science</option>
                                    <option value="Product Management">Product Management</option>
                                    <option value="Design">Design</option>
                                    <option value="Marketing">Marketing</option>
                                </select>
                            </div>
                            <ErrorMessage message={errors.category?.message} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job Type</label>
                            <select
                                {...register("type")}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            >
                                <option value="Full-time">Full-time</option>
                                <option value="Contract">Contract</option>
                                <option value="Part-time">Part-time</option>
                                <option value="Remote">Remote</option>
                            </select>
                            <ErrorMessage message={errors.type?.message} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Salary (Optional)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <input
                                    {...register("salary")}
                                    placeholder="e.g. 50k - 80k ETB"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Deadline</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <input
                                    type="date"
                                    {...register("deadline")}
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <List className="h-5 w-5 text-indigo-600" /> Description & Skills
                </h2>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job Description</label>
                        <textarea
                            {...register("description")}
                            rows={6}
                            placeholder="Provide a detailed description of the role, responsibilities, and key requirements..."
                            className={`w-full rounded-xl border bg-white py-3 px-3 text-sm outline-none transition focus:ring-2 ${errors.description ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100"
                                }`}
                        />
                        <ErrorMessage message={errors.description?.message} />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Required Skills (Press Enter to add)</label>
                        <div className={`flex flex-wrap gap-2 rounded-xl border bg-white p-2 transition focus-within:ring-2 ${errors.skills ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-100" : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-indigo-100"
                            }`}>
                            {skills.map((s) => (
                                <span key={s} className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                                    {s}
                                    <button type="button" onClick={() => removeSkill(s)} className="text-indigo-400 hover:text-indigo-600">
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                            <input
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={handleAddSkill}
                                placeholder={skills.length === 0 ? "e.g. React, Python" : ""}
                                className="flex-1 min-w-[80px] bg-transparent py-1 px-1 text-sm outline-none"
                            />
                        </div>
                        <ErrorMessage message={errors.skills?.message} />
                    </div>
                </div>
            </Card>

            <div className="flex justify-end gap-3">
                <Button variant="secondary" type="button" onClick={() => window.history.back()}>
                    Cancel
                </Button>
                <Button type="submit" loading={isLoading} disabled={isLoading}>
                    {isLoading ? "Posting..." : "Post Job Listing"}
                    {!isLoading && <Send className="h-4 w-4" />}
                </Button>
            </div>
        </form>
    );
}
