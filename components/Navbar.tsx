"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { BriefcaseBusiness, ChevronDown, LogOut, User, LayoutDashboard, Building2, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button";

const navLinks = [
  { label: "Jobs", href: "/jobs" },
  { label: "How it Works", href: "/#how-it-works" },
  { label: "Security", href: "/#security" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const user = session?.user as any;
  const isRecruiter = user?.role === "RECRUITER" || user?.role === "recruiter";
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "SR";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
          </span>
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
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
              >
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={user.name ?? "User"} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {initials}
                  </span>
                )}
                <span className="hidden sm:block">{user?.name?.split(" ")[0] ?? "Account"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                    <div className="border-b border-slate-100 px-3 py-2 mb-1">
                      <p className="text-xs font-medium text-slate-900">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {isRecruiter ? "Recruiter" : "Job Seeker"}
                      </span>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <LayoutDashboard className="h-4 w-4 text-slate-400" />
                      Dashboard
                    </Link>
                    {isRecruiter && (
                      <Link
                        href="/recruiter"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Building2 className="h-4 w-4 text-slate-400" />
                        Recruiter Portal
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      Profile
                    </Link>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={() => { setIsUserMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
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
