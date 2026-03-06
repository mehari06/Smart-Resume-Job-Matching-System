import Link from "next/link";
import { BriefcaseBusiness, Github, Twitter, Linkedin, Mail } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <BriefcaseBusiness className="h-4 w-4" />
              </span>
              <span className="text-lg font-bold tracking-tight text-slate-900">Smart Resume</span>
            </Link>
            <p className="max-w-xs text-sm text-slate-500 leading-relaxed">
              Intelligent resume-to-job matching for the African tech ecosystem. Powered by NLP and TF-IDF weighted explainable AI.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-slate-400 hover:text-slate-600 transition-colors"><Twitter className="h-5 w-5" /></Link>
              <Link href="#" className="text-slate-400 hover:text-slate-600 transition-colors"><Github className="h-5 w-5" /></Link>
              <Link href="#" className="text-slate-400 hover:text-slate-600 transition-colors"><Linkedin className="h-5 w-5" /></Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Platform</h4>
            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              <li><Link href="/jobs" className="hover:text-indigo-600">Browse Jobs</Link></li>
              <li><Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link></li>
              <li><Link href="/matches" className="hover:text-indigo-600">Match Engine</Link></li>
              <li><Link href="/recruiter" className="hover:text-indigo-600">Recruiter Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Support</h4>
            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              <li><Link href="#" className="hover:text-indigo-600">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-indigo-600">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-indigo-600">Contact Support</Link></li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-xs">support@smartresume.ai</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-8 text-center text-xs text-slate-400">
          <p>© {currentYear} Smart Resume – Job Matching System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
