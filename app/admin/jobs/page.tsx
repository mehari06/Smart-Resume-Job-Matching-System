import React from 'react';
import prisma from '../../../lib/prisma';
import { AlertTriangle } from 'lucide-react';
import { AdminJobDeleteButton } from '../../../components/admin/AdminJobDeleteButton';

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({
    include: {
      postedBy: true,
      _count: { select: { applications: true } }
    },
    orderBy: { postedAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">System Jobs</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recruiter</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map(job => (
              <tr key={job.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{job.title}</div>
                  <div className="text-xs text-gray-500">{new Date(job.postedAt).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {job.company}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{job.postedBy?.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{job.postedBy?.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {job._count.applications}
                </td>
                <td className="px-6 py-4 whitespace-nowrap flex space-x-2 text-sm text-gray-500">
                  <button type="button" className="flex items-center px-3 py-1 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Flag
                  </button>
                  <AdminJobDeleteButton jobId={job.id} jobTitle={job.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
