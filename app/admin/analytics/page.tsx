import React from 'react';
import prisma from '../../../lib/prisma';
import AnalyticsCharts from './AnalyticsCharts';

export default async function AnalyticsPage() {
  const users = await prisma.user.findMany({ select: { createdAt: true, role: true } });
  const jobs = await prisma.job.findMany({ select: { postedAt: true } });
  const apps = await prisma.application.findMany({ select: { createdAt: true } });

  const roleDistribution = [
    { name: 'Seekers', value: users.filter(u => u.role === 'SEEKER').length },
    { name: 'Recruiters', value: users.filter(u => u.role === 'RECRUITER').length },
    { name: 'Admins', value: users.filter(u => u.role === 'ADMIN').length },
  ].filter(r => r.value > 0);

  const currentMonth = new Date().getMonth();
  const jobsThisMonth = jobs.filter(j => new Date(j.postedAt).getMonth() === currentMonth).length;
  const applicationsThisMonth = apps.filter(a => new Date(a.createdAt).getMonth() === currentMonth).length;

  const monthStats = [
    { name: 'This Month', Jobs: jobsThisMonth, Applications: applicationsThisMonth }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
      
      <div className="bg-white p-6 shadow rounded-lg border border-gray-200">
         <AnalyticsCharts roleData={roleDistribution} monthData={monthStats} />
      </div>
    </div>
  );
}
