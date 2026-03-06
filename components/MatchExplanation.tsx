"use client";

import { Info, HelpCircle, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Tooltip } from "./Tooltip";

interface Props {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    explanation?: string;
}

export function MatchExplanation({ score, matchedSkills, missingSkills, explanation }: Props) {
    const getScoreInfo = (s: number) => {
        if (s >= 80) return { label: "Excellent Match", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 };
        if (s >= 60) return { label: "Good Match", color: "text-indigo-600", bg: "bg-indigo-50", icon: Sparkles };
        if (s >= 40) return { label: "Fair Match", color: "text-amber-600", bg: "bg-amber-50", icon: Info };
        return { label: "Low Overlap", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle };
    };

    const info = getScoreInfo(score);

    return (
        <div className="space-y-4">
            <div className={`flex items-center gap-3 rounded-2xl border border-transparent p-4 ${info.bg}`}>
                <div className={`rounded-xl border border-white bg-white/50 p-2 ${info.color}`}>
                    <info.icon className="h-5 w-5" />
                </div>
                <div>
                    <p className={`text-sm font-bold uppercase tracking-wider ${info.color}`}>{info.label}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                        Your profile has {score}% keyword overlap with the job's core requirements.
                    </p>
                </div>
            </div>

            {explanation && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        <HelpCircle className="h-3.5 w-3.5" /> AI Explanation
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed italic">
                        "{explanation}"
                    </p>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Matched Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {matchedSkills.map((s) => (
                            <span key={s} className="rounded-full bg-emerald-100/50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                {s}
                            </span>
                        ))}
                        {matchedSkills.length === 0 && <span className="text-xs text-slate-400 italic">No direct keyword matches found.</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Missing Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {missingSkills.map((s) => (
                            <span key={s} className="rounded-full bg-amber-100/50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                                {s}
                            </span>
                        ))}
                        {missingSkills.length === 0 && <span className="text-xs text-emerald-600 italic">You have all the required skills listed!</span>}
                    </div>
                </div>
            </div>

            <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                <p className="text-[11px] leading-snug text-indigo-600/80">
                    <strong>How we score:</strong> We use TF-IDF (Term Frequency-Inverse Document Frequency) to weigh the importance of skills. Rare skills (like "Kubernetes" or "NLP") are given higher weight than common ones (like "Communication").
                </p>
            </div>
        </div>
    );
}
