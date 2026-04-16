import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { redirect } from 'next/navigation';
import prisma from '../../lib/prisma';
import { AdminSidebar } from '../../components/admin/AdminSidebar';

export const metadata = {
  title: 'Admin Dashboard | Smart Resume',
  description: 'Administration panel for the Smart Resume Job Matching System',
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Count pending recruiter requests for the badge
  const pendingCount = await prisma.user.count({
    where: { approvalStatus: 'PENDING' }
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar
        pendingCount={pendingCount}
        adminName={session.user?.name}
        adminEmail={session.user?.email}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
