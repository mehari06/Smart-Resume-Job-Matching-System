import prisma from "../../../lib/prisma";
import AnalyticsCharts from "./AnalyticsCharts";

export const dynamic = "force-dynamic";

type TrendBucket = {
    label: string;
    jobs: number;
    applications: number;
    users: number;
    averageMatchScore: number;
};

function getMonthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
    return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function buildRecentMonths(count: number) {
    const months: Array<{ key: string; label: string }> = [];
    const today = new Date();

    for (let index = count - 1; index >= 0; index -= 1) {
        const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
        months.push({ key: getMonthKey(date), label: getMonthLabel(date) });
    }

    return months;
}

function normalizeSkill(skill: string) {
    return skill.trim().toLowerCase();
}

function countSkills(skillsList: string[][]) {
    const counts = new Map<string, number>();

    for (const skills of skillsList) {
        for (const rawSkill of skills) {
            const skill = normalizeSkill(rawSkill);
            if (!skill) continue;
            counts.set(skill, (counts.get(skill) ?? 0) + 1);
        }
    }

    return counts;
}

function formatSkill(skill: string) {
    return skill
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export default async function AnalyticsPage() {
    const [users, jobs, applications, matches, resumes] = await Promise.all([
        prisma.user.findMany({
            select: {
                id: true,
                role: true,
                approvalStatus: true,
                createdAt: true,
            },
        }),
        prisma.job.findMany({
            select: {
                id: true,
                title: true,
                company: true,
                postedAt: true,
                skills: true,
                postedById: true,
                postedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        applications: true,
                    },
                },
            },
        }),
        prisma.application.findMany({
            select: {
                id: true,
                createdAt: true,
                status: true,
                jobId: true,
                userId: true,
                job: {
                    select: {
                        id: true,
                        title: true,
                        postedById: true,
                        postedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.match.findMany({
            select: {
                id: true,
                score: true,
                computedAt: true,
                missingSkills: true,
            },
        }),
        prisma.resume.findMany({
            select: {
                id: true,
                skills: true,
                uploadedAt: true,
            },
        }),
    ]);

    const averageMatchScore =
        matches.length > 0
            ? matches.reduce((sum, match) => sum + match.score, 0) / matches.length
            : 0;

    const approvedRecruiters = users.filter(
        (user) => user.role === "RECRUITER" || user.approvalStatus === "APPROVED"
    ).length;
    const admins = users.filter((user) => user.role === "ADMIN").length;
    const seekers = Math.max(users.length - approvedRecruiters - admins, 0);

    const recentMonths = buildRecentMonths(6);
    const trendMap = new Map<string, TrendBucket>(
        recentMonths.map((month) => [
            month.key,
            { label: month.label, jobs: 0, applications: 0, users: 0, averageMatchScore: 0 },
        ])
    );
    const matchTrendCounts = new Map<string, { total: number; count: number }>();

    for (const user of users) {
        const key = getMonthKey(new Date(user.createdAt));
        const bucket = trendMap.get(key);
        if (bucket) bucket.users += 1;
    }

    for (const job of jobs) {
        const key = getMonthKey(new Date(job.postedAt));
        const bucket = trendMap.get(key);
        if (bucket) bucket.jobs += 1;
    }

    for (const application of applications) {
        const key = getMonthKey(new Date(application.createdAt));
        const bucket = trendMap.get(key);
        if (bucket) bucket.applications += 1;
    }

    for (const match of matches) {
        const key = getMonthKey(new Date(match.computedAt));
        const current = matchTrendCounts.get(key) ?? { total: 0, count: 0 };
        current.total += match.score;
        current.count += 1;
        matchTrendCounts.set(key, current);
    }

    for (const [key, bucket] of trendMap.entries()) {
        const current = matchTrendCounts.get(key);
        bucket.averageMatchScore = current && current.count > 0 ? Number((current.total / current.count).toFixed(1)) : 0;
    }

    const trendData = Array.from(trendMap.values());

    const jobPerformance = jobs
        .map((job) => ({
            id: job.id,
            title: job.title,
            company: job.company,
            applications: job._count.applications,
        }))
        .sort((left, right) => right.applications - left.applications);

    const zeroApplicantJobs = jobPerformance.filter((job) => job.applications === 0).slice(0, 8);

    const matchScoreBuckets = [
        { label: "High Match", value: matches.filter((match) => match.score >= 80).length },
        { label: "Medium Match", value: matches.filter((match) => match.score >= 50 && match.score < 80).length },
        { label: "Low Match", value: matches.filter((match) => match.score < 50).length },
    ];

    const funnelOrder = ["APPLIED", "REVIEWED", "SHORTLISTED", "REJECTED", "HIRED"];
    const applicationFunnel = funnelOrder.map((status) => ({
        stage: status.charAt(0) + status.slice(1).toLowerCase(),
        value: applications.filter((application) => (application.status ?? "APPLIED") === status).length,
    }));

    const jobSkillCounts = countSkills(jobs.map((job) => job.skills ?? []));
    const candidateSkillCounts = countSkills(resumes.map((resume) => resume.skills ?? []));

    const topJobSkills = Array.from(jobSkillCounts.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
        .map(([skill, count]) => ({ skill: formatSkill(skill), count }));

    const topCandidateSkills = Array.from(candidateSkillCounts.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
        .map(([skill, count]) => ({ skill: formatSkill(skill), count }));

    const skillsGap = Array.from(jobSkillCounts.entries())
        .map(([skill, demand]) => ({
            skill: formatSkill(skill),
            demand,
            supply: candidateSkillCounts.get(skill) ?? 0,
            gap: demand - (candidateSkillCounts.get(skill) ?? 0),
        }))
        .sort((left, right) => right.gap - left.gap)
        .slice(0, 8);

    const recruiterJobCounts = new Map<string, { name: string; jobsPosted: number; applicationsReceived: number }>();

    for (const job of jobs) {
        if (!job.postedById) continue;
        const entry = recruiterJobCounts.get(job.postedById) ?? {
            name: job.postedBy?.name || job.postedBy?.email || "Unknown recruiter",
            jobsPosted: 0,
            applicationsReceived: 0,
        };
        entry.jobsPosted += 1;
        entry.applicationsReceived += job._count.applications;
        recruiterJobCounts.set(job.postedById, entry);
    }

    const topRecruiters = Array.from(recruiterJobCounts.values())
        .sort((left, right) => {
            if (right.jobsPosted !== left.jobsPosted) return right.jobsPosted - left.jobsPosted;
            return right.applicationsReceived - left.applicationsReceived;
        })
        .slice(0, 6);

    const overviewCards = [
        { label: "Total Users", value: users.length.toLocaleString(), tone: "sky" },
        { label: "Total Jobs", value: jobs.length.toLocaleString(), tone: "amber" },
        { label: "Total Applications", value: applications.length.toLocaleString(), tone: "emerald" },
        { label: "Average Match Score", value: `${averageMatchScore.toFixed(1)}%`, tone: "rose" },
    ];

    const roleDistribution = [
        { name: "Job Seekers", value: seekers },
        { name: "Recruiters", value: approvedRecruiters },
        { name: "Admins", value: admins },
    ].filter((item) => item.value > 0);

    return (
        <div className="space-y-8">
            <div className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_32%),linear-gradient(180deg,_#fffefc,_#f8fafc)] p-8 shadow-sm">
                <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Admin Analytics</p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">System health, growth, and hiring momentum in one place</h1>
                    <p className="mt-3 text-sm text-slate-600">
                        This dashboard combines platform growth, recruiter performance, resume quality, and application conversion so you can spot bottlenecks quickly.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((card) => (
                    <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                        <p className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</p>
                    </div>
                ))}
            </div>

            <AnalyticsCharts
                roleDistribution={roleDistribution}
                trendData={trendData}
                jobPerformance={jobPerformance.slice(0, 8)}
                matchScoreBuckets={matchScoreBuckets}
                applicationFunnel={applicationFunnel}
                topJobSkills={topJobSkills}
                topCandidateSkills={topCandidateSkills}
                skillsGap={skillsGap}
                topRecruiters={topRecruiters}
            />

            <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Job Performance Highlights</h2>
                            <p className="mt-1 text-sm text-slate-500">See which roles attract applicants and which jobs need distribution help.</p>
                        </div>
                        <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            {zeroApplicantJobs.length} zero-applicant jobs
                        </div>
                    </div>

                    <div className="mt-5 space-y-3">
                        {jobPerformance.slice(0, 6).map((job, index) => (
                            <div key={job.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{index + 1}. {job.title}</p>
                                    <p className="text-xs text-slate-500">{job.company}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-semibold text-slate-900">{job.applications}</p>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Applicants</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Jobs With Zero Applicants</h2>
                    <p className="mt-1 text-sm text-slate-500">These postings may need better copy, salary clarity, or broader promotion.</p>

                    <div className="mt-5 space-y-3">
                        {zeroApplicantJobs.length === 0 ? (
                            <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                Every active job has at least one applicant right now.
                            </p>
                        ) : (
                            zeroApplicantJobs.map((job) => (
                                <div key={job.id} className="rounded-2xl border border-slate-100 px-4 py-3">
                                    <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                                    <p className="text-xs text-slate-500">{job.company}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
