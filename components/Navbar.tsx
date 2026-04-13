"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LogOut, User, Users, LayoutDashboard, Building2, Menu, X, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "./Button";
import { BrandMark } from "./BrandMark";

const navLinks = [
  { label: "Jobs", href: "/jobs" },
  { label: "How it Works", href: "/#how-it-works" },
  { label: "Security", href: "/#security" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const user = session?.user as any;
  const isRecruiter = user?.role === "RECRUITER" || user?.role === "recruiter";
  const isAdmin = user?.role === "ADMIN";
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "SR";

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.image]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2">
          <BrandMark />
          <span className="text-base font-semibold tracking-tight text-slate-900">Smart Resume</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex" aria-label="Main navigation">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {status === "loading" ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-200" />
          ) : session ? (
            /* Authenticated user dropdown */
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {user?.image && !avatarFailed ? (
                    <Image
                      src={user.image}
                      alt={user.name ?? "User"}
                      width={24}
                      height={24}
                      loading="lazy"
                      unoptimized
                      className="h-6 w-6 rounded-full object-cover"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {initials}
                    </span>
                  )}
                  <span className="hidden sm:block">{user?.name?.split(" ")[0] ?? "Account"}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95"
                >
                  <div className="border-b border-slate-100 px-3 py-2 mb-1">
                    <p className="text-xs font-medium text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {isRecruiter ? "Recruiter" : "Job Seeker"}
                    </span>
                  </div>

                  <DropdownMenu.Item asChild>
                    <Link
                      href="/dashboard"
                      className="flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-50 focus:bg-slate-50"
                    >
                      <LayoutDashboard className="h-4 w-4 text-slate-400" />
                      Dashboard
                    </Link>
                  </DropdownMenu.Item>

                  {isAdmin && (
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/admin/users"
                        className="flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-600 font-medium outline-none hover:bg-slate-50 focus:bg-slate-50"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenu.Item>
                  )}

                  {isRecruiter && (
                    <>
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/recruiter"
                          className="flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-50 focus:bg-slate-50"
                        >
                          <Building2 className="h-4 w-4 text-slate-400" />
                          Recruiter Portal
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/recruiter/applicants"
                          className="flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-50 focus:bg-slate-50"
                        >
                          <Users className="h-4 w-4 text-slate-400" />
                          Candidates List
                        </Link>
                      </DropdownMenu.Item>
                    </>
                  )}

                  <DropdownMenu.Item asChild>
                    <Link
                      href="/profile"
                      className="flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-50 focus:bg-slate-50"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      Profile
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="my-1 border-t border-slate-100" />

                  <DropdownMenu.Item asChild>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50 focus:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            /* Guest CTA */
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login">Get Started</Link>
              </Button>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-sm text-slate-700 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
