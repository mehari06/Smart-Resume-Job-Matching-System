import React from 'react';
import prisma from '../../../lib/prisma';
import { ShieldAlert, UserX } from 'lucide-react';
import { revalidatePath } from 'next/cache';

async function resolveReport(formData: FormData) {
  'use server';
  const reportId = formData.get('reportId') as string;
  await prisma.userReport.update({
    where: { id: reportId },
    data: { status: 'RESOLVED' }
  });
  revalidatePath('/admin/moderation');
}

export default async function ModerationPage() {
  const userReports = await prisma.userReport.findMany({
    include: {
      reported: true,
      reporter: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Moderation Queue</h1>
      <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <ShieldAlert className="w-6 h-6 mr-2 text-red-500" />
          User Reports
        </h2>
        {userReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <ShieldAlert className="w-12 h-12 mb-2 opacity-50" />
            <p>No pending reports to moderate.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {userReports.map((report) => (
               <li key={report.id} className="py-4 flex justify-between items-start">
                 <div>
                   <p className="font-semibold text-gray-800">
                     Report on: {report.reported?.email} {report.reported?.banned ? '(BANNED)' : ''}
                   </p>
                   <p className="text-sm text-gray-600 font-medium">Reason: {report.reason}</p>
                   <p className="text-xs text-gray-400 mt-1">Status: {report.status} • By: {report.reporter?.email}</p>
                 </div>
                 {report.status !== 'RESOLVED' && (
                   <form action={resolveReport}>
                     <input type="hidden" name="reportId" value={report.id} />
                     <button className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-sm font-medium">
                       Mark Resolved
                     </button>
                   </form>
                 )}
               </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
