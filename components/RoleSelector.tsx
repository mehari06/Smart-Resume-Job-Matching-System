"use client";

import { BadgeCheck, Building2, User } from "lucide-react";
import { cn } from "./utils";
import type { Role } from "../types";

type RoleSelectorProps = {
  value: Role;
  onChange: (value: Role) => void;
};

const options: Array<{ value: Role; title: string; description: string; icon: typeof User }> = [
  {
    value: "jobSeeker",
    title: "Job Seeker",
    description: "Upload your resume and get ranked job matches.",
    icon: User
  },
  {
    value: "recruiter",
    title: "Recruiter",
    description: "Upload role requirements and find best-fit resumes.",
    icon: Building2
  }
];

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <fieldset className="space-y-3" aria-label="Select role">
      <legend className="text-sm font-medium text-slate-700">Choose your role</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                selected
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
              aria-pressed={selected}
            >
              <Icon className={cn("mb-2 h-5 w-5", selected ? "text-indigo-600" : "text-slate-500")} aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                {selected && <BadgeCheck className="h-4 w-4 text-indigo-600" aria-hidden="true" />}
              </div>
              <p className="mt-1 text-xs text-slate-500">{option.description}</p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
