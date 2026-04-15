import React from 'react';
import prisma from '../../../lib/prisma';
import { Ban, CheckCircle } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { AdminUserBanButton } from '../../../components/admin/AdminUserBanButton';

export const dynamic = "force-dynamic";

async function handleRecruiterRequest(formData: FormData) {
  'use server';
  const userId = formData.get('userId') as string;
  const action = formData.get('action') as string;

  console.log(`[Admin Action] ${action} for user ${userId}`);

  try {
    if (action === "approve") {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: "RECRUITER", approvalStatus: "APPROVED" }
      });
      console.log(`[Admin Action] Successfully approved user: ${updated.email}`);
    } else if (action === "reject") {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { approvalStatus: "REJECTED" }
      });
      console.log(`[Admin Action] Successfully rejected user: ${updated.email}`);
    }
  } catch (error) {
    console.error(`[Admin Action] Failed to ${action} user ${userId}:`, error);
    throw error;
  }

  revalidatePath('/admin/users');
}

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const pendingRequests = users.filter(u => u.approvalStatus === 'PENDING');

  return (
    <div className="space-y-8">
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pending Recruiter Requests</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden border border-amber-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Candidate Name/Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Requested At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingRequests.map(user => (
                  <tr key={`req-${user.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name || 'No Name'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                       <form action={handleRecruiterRequest}>
                         <input type="hidden" name="userId" value={user.id} />
                         <input type="hidden" name="action" value="approve" />
                         <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs flex items-center gap-1">
                           <CheckCircle className="w-3 h-3" /> Approve
                         </button>
                       </form>
                       <form action={handleRecruiterRequest}>
                         <input type="hidden" name="userId" value={user.id} />
                         <input type="hidden" name="action" value="reject" />
                         <button type="submit" className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center gap-1">
                           <Ban className="w-3 h-3" /> Reject
                         </button>
                       </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">All Users</h1>
        
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name/Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name || 'No Name'}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                      {user.role}
                    </span>
                    {user.role === 'RECRUITER' && user.approvalStatus === 'APPROVED' && (
                      <span className="ml-2 px-2 inline-flex text-[10px] leading-5 font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                        Approved
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.banned ? (
                       <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Banned</span>
                    ) : (
                       <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      user.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      user.approvalStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <AdminUserBanButton
                      userId={user.id}
                      userName={user.name || user.email || 'this user'}
                      banned={user.banned}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
