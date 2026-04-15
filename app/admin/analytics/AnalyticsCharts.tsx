'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Datum = Record<string, string | number>;

type AnalyticsChartsProps = {
  roleDistribution: Array<{ name: string; value: number }>;
  trendData: Array<{ label: string; jobs: number; applications: number; users: number; averageMatchScore: number }>;
  jobPerformance: Array<{ title: string; applications: number }>;
  matchScoreBuckets: Array<{ label: string; value: number }>;
  applicationFunnel: Array<{ stage: string; value: number }>;
  topJobSkills: Array<{ skill: string; count: number }>;
  topCandidateSkills: Array<{ skill: string; count: number }>;
  skillsGap: Array<{ skill: string; demand: number; supply: number; gap: number }>;
  topRecruiters: Array<{ name: string; jobsPosted: number; applicationsReceived: number }>;
};

const ROLE_COLORS = ['#0ea5e9', '#f59e0b', '#ef4444', '#14b8a6'];
const MATCH_COLORS = ['#16a34a', '#f59e0b', '#ef4444'];

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5 h-[320px]">{children}</div>
    </section>
  );
}

function SharedTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      {label ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p> : null}
      <div className="mt-1 space-y-1">
        {payload.map((entry) => (
          <p key={`${entry.name}-${entry.value}`} className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{entry.name}</span>: {entry.value}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsCharts({
  roleDistribution,
  trendData,
  jobPerformance,
  matchScoreBuckets,
  applicationFunnel,
  topJobSkills,
  topCandidateSkills,
  skillsGap,
  topRecruiters,
}: AnalyticsChartsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard
        title="User Growth And Roles"
        description="Track user growth over time and the mix between job seekers, recruiters, and admins."
      >
        <div className="grid h-full gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={45}>
                {roleDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<SharedTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<SharedTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} name="New Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Platform Activity Trends"
        description="Compare job posting velocity, application volume, and average match quality month by month."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fill: '#475569', fontSize: 12 }} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#475569', fontSize: 12 }} domain={[0, 100]} />
            <Tooltip content={<SharedTooltip />} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="jobs" stroke="#f59e0b" strokeWidth={3} name="Jobs Posted" />
            <Line yAxisId="left" type="monotone" dataKey="applications" stroke="#14b8a6" strokeWidth={3} name="Applications" />
            <Line yAxisId="right" type="monotone" dataKey="averageMatchScore" stroke="#ef4444" strokeWidth={3} name="Avg Match Score" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Job Performance Analytics"
        description="Spot your most popular jobs quickly and compare applicants across open positions."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={jobPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="title" tick={{ fill: '#475569', fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
            <YAxis tick={{ fill: '#475569', fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<SharedTooltip />} />
            <Bar dataKey="applications" fill="#0f766e" radius={[10, 10, 0, 0]} name="Applications" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Resume Match Score Distribution"
        description="See how candidate-job fit breaks down across high, medium, and low match quality."
      >
        <div className="grid h-full gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={matchScoreBuckets} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={95} innerRadius={40}>
                {matchScoreBuckets.map((entry, index) => (
                  <Cell key={entry.label} fill={MATCH_COLORS[index % MATCH_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<SharedTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip content={<SharedTooltip />} />
              <Line type="monotone" dataKey="averageMatchScore" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Average Match Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Application Funnel"
        description="Monitor how applications move from first submission through hiring outcomes."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={applicationFunnel}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="stage" tick={{ fill: '#475569', fontSize: 12 }} />
            <YAxis tick={{ fill: '#475569', fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<SharedTooltip />} />
            <Bar dataKey="value" fill="#f97316" radius={[10, 10, 0, 0]} name="Applications" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Skills Demand Vs Candidate Supply"
        description="Compare the skills companies request against the skills candidates upload most often."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={skillsGap}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="skill" tick={{ fill: '#475569', fontSize: 11 }} interval={0} angle={-16} textAnchor="end" height={75} />
            <YAxis tick={{ fill: '#475569', fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<SharedTooltip />} />
            <Legend />
            <Bar dataKey="demand" fill="#0ea5e9" radius={[8, 8, 0, 0]} name="Demand" />
            <Bar dataKey="supply" fill="#22c55e" radius={[8, 8, 0, 0]} name="Supply" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Top Job Skills"
        description="The most requested skills across posted jobs right now."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topJobSkills}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="skill" tick={{ fill: '#475569', fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={75} />
            <YAxis tick={{ fill: '#475569', fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<SharedTooltip />} />
            <Bar dataKey="count" fill="#0284c7" radius={[10, 10, 0, 0]} name="Job Demand" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Top Candidate Skills"
        description="The most common skills candidates include in their uploaded resumes."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topCandidateSkills}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="skill" tick={{ fill: '#475569', fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={75} />
            <YAxis tick={{ fill: '#475569', fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<SharedTooltip />} />
            <Bar dataKey="count" fill="#16a34a" radius={[10, 10, 0, 0]} name="Candidate Supply" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Top Recruiters"
        description="Highlight recruiters posting the most jobs and attracting the most applications."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topRecruiters}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={65} />
            <YAxis tick={{ fill: '#475569', fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<SharedTooltip />} />
            <Legend />
            <Bar dataKey="jobsPosted" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Jobs Posted" />
            <Bar dataKey="applicationsReceived" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Applications Received" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
