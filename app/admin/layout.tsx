import React from 'react';
import Link from 'next/link';
import { Shield, LayoutDashboard, Users, Briefcase, BarChart, Flag, CheckCircle } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { redirect } from 'next/navigation';
import prisma from '../../lib/prisma';

export const metadata = {
  title: 'Admin Dashboard | Smart Resume',
  description: 'Administration panel for the Smart Resume Job Matching System',
};

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'All Users', href: '/admin/users', icon: Users },
  { name: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart },
  { name: 'Moderation', href: '/admin/moderation', icon: Flag },
];

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
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Shield className="w-6 h-6 text-indigo-600 mr-2" />
          <span className="font-bold text-lg text-gray-900">Admin Panel</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}

          {/* Approval Queue - highlighted with badge */}
          <Link
            href="/admin/users"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 transition-colors border border-amber-200 mt-2"
          >
            <CheckCircle className="w-5 h-5 mr-3" />
            Approval Queue
            {pendingCount > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
