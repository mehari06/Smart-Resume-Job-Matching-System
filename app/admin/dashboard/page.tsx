import React from 'react';
import prisma from '../../../lib/prisma';
import { Users, Briefcase, FileText, Activity } from 'lucide-react';

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const usersCount = await prisma.user.count();
  const recruitersCount = await prisma.user.count({ where: { role: 'RECRUITER' } });
  const seekersCount = await prisma.user.count({ where: { role: 'SEEKER' } });
  const jobsCount = await prisma.job.count();
  const applicationsCount = await prisma.application.count();

  const stats = [
    { name: 'Total Users', value: usersCount.toLocaleString(), icon: Users },
    { name: 'Recruiters', value: recruitersCount.toLocaleString(), icon: Users },
    { name: 'Job Seekers', value: seekersCount.toLocaleString(), icon: Users },
    { name: 'Active Jobs', value: jobsCount.toLocaleString(), icon: Briefcase },
    { name: 'Total Applications', value: applicationsCount.toLocaleString(), icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <Icon className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96 flex flex-col justify-center items-center">
             <Activity className="w-12 h-12 text-gray-300 mb-4" />
             <p className="text-gray-500 font-medium">Platform Activity Chart (Recharts Placeholder)</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96 flex flex-col justify-center items-center">
             <Activity className="w-12 h-12 text-gray-300 mb-4" />
             <p className="text-gray-500 font-medium">Job Postings Chart (Recharts Placeholder)</p>
        </div>
      </div>
    </div>
  );
}
