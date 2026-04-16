"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Shield,
  LayoutDashboard,
  Users,
  Briefcase,
  BarChart,
  Flag,
  CheckCircle,
  UserCircle2,
  LogOut,
} from "lucide-react";
import { Button } from "../Button";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  accent?: boolean;
};

type Props = {
  pendingCount: number;
  adminName?: string | null;
  adminEmail?: string | null;
};

export function AdminSidebar({ pendingCount, adminName, adminEmail }: Props) {
  const pathname = usePathname();

  const navigation: NavItem[] = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "All Users", href: "/admin/users", icon: Users },
    { name: "Jobs", href: "/admin/jobs", icon: Briefcase },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart },
    { name: "Moderation", href: "/admin/moderation", icon: Flag },
    {
      name: "Approval Queue",
      href: "/admin/users",
      icon: CheckCircle,
      badge: pendingCount,
      accent: true,
    },
    { name: "Admin Profile", href: "/profile", icon: UserCircle2 },
  ];

  return (
    <>
      <aside className="hidden w-72 border-r border-gray-200 bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center px-6 border-b border-gray-200">
          <Shield className="mr-2 h-6 w-6 text-indigo-600" />
          <span className="text-lg font-bold text-gray-900">Admin Panel</span>
        </div>

        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">{adminName || "Admin User"}</p>
          <p className="truncate text-xs text-gray-500">{adminEmail || "No email"}</p>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

            const baseClasses = item.accent
              ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
              : isActive
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-700 hover:bg-gray-100 hover:text-indigo-600";

            return (
              <Link
                key={`${item.name}-${item.href}`}
                href={item.href}
                className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${baseClasses}`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 px-4 py-4">
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">{adminName || "Admin User"}</p>
            <p className="truncate text-xs text-gray-500">{adminEmail || "No email"}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={`${item.name}-${item.href}-mobile`}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium ${
                  isActive ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {item.name}
                {typeof item.badge === "number" && item.badge > 0 ? ` (${item.badge})` : ""}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
