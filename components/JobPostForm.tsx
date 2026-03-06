"use client";

import { useState } from "react";
import { Plus, X, Briefcase, MapPin, DollarSign, Calendar, List, Layout, Send, Loader2 } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { toast } from "sonner";

export function JobPostForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState("");

    const handleAddSkill = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && skillInput.trim()) {
            e.preventDefault();
            if (!skills.includes(skillInput.trim())) {
                setSkills([...skills, skillInput.trim()]);
                setSkillInput("");
            }
        }
    };

    const removeSkill = (s: string) => {
        setSkills(skills.filter((item) => item !== s));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API POST
        await new Promise((r) => setTimeout(r, 1200));
        setIsLoading(false);
        toast.success("Job posted successfully!", { description: "Applicants will now see this matched with their resumes." });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-indigo-600" /> Job Details
                </h2>
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job Title</label>
                            <input
                                required
                                placeholder="e.g. Senior Full Stack Developer"
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company Name</label>
                            <input
                                required
                                placeholder="e.g. Afriwork"
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <input
                                    required
                                    placeholder="e.g. Addis Ababa, Remote"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job Category</label>
                            <div className="relative">
                                <Layout className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <select className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                                    <option>Engineering</option>
                                    <option>Data Science</option>
                                    <option>Product Management</option>
                                    <option>Design</option>
                                    <option>Marketing</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Job Type</label>
                            <select className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-indigo-500">
                                <option>Full-time</option>
                                <option>Contract</option>
                                <option>Part-time</option>
                                <option>Remote</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Salary (Optional)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <input
                                    placeholder="e.g. 50k - 80k ETB"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Deadline</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <input
                                    type="date"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500"
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
                            required
                            rows={6}
                            placeholder="Provide a detailed description of the role, responsibilities, and key requirements..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Required Skills (Press Enter to add)</label>
                        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition">
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
