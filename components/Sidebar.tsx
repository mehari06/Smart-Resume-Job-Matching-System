"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Briefcase,
    FileText,
    Target,
    User,
    Settings,
    HelpCircle,
    Building2,
    TrendingUp,
    History
} from "lucide-react";

interface SidebarProps {
    role: "SEEKER" | "RECRUITER" | "ADMIN";
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();

    const seekerLinks = [
        { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { label: "Job Matches", href: "/matches", icon: Target },
        { label: "My Resumes", href: "/dashboard#resumes", icon: FileText },
        { label: "Browse Jobs", href: "/jobs", icon: Briefcase },
        { label: "Match History", href: "/history", icon: History },
    ];

    const recruiterLinks = [
        { label: "Recruiter Hub", href: "/recruiter", icon: Building2 },
        { label: "Candidates", href: "/recruiter/candidates", icon: User },
        { label: "My Job Posts", href: "/recruiter/jobs", icon: Briefcase },
        { label: "Analytics", href: "/recruiter/analytics", icon: TrendingUp },
    ];

    const commonLinks = [
        { label: "Profile", href: "/profile", icon: User },
        { label: "Settings", href: "/settings", icon: Settings },
        { label: "Help Center", href: "/help", icon: HelpCircle },
    ];

    const activeLinks = role === "RECRUITER" ? recruiterLinks : seekerLinks;

    return (
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-60 flex-col border-r border-slate-200 bg-white p-4 md:flex">
            <div className="flex-1 space-y-1">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Main Menu</p>
                {activeLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            <link.icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                            {link.label}
                        </Link>
                    );
                })}

                <div className="my-6 border-t border-slate-100 pt-6">
                    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Settings</p>
                    {commonLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                                        ? "bg-indigo-50 text-indigo-700"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                            >
                                <link.icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-2xl bg-indigo-900 p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Pro Tip</p>
                <p className="mt-1 text-[11px] leading-relaxed text-indigo-100">
                    Tailor your resume skills to the job description to improve your match score.
                </p>
            </div>
        </aside>
    );
}
