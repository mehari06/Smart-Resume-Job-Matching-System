"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Users, FileText, Download, Eye, ChevronLeft, ChevronRight, SlidersHorizontal, ArrowLeft, RefreshCw, Mail, Phone, MapPin, GraduationCap, X } from "lucide-react";
import { Navbar } from "../../../components/Navbar";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { CircularScore } from "../../../components/CircularScore";
import { toast } from "sonner";
import Link from "next/link";

type Applicant = {
  matchId: string;
  type?: "DIRECT_APPLICATION" | "ML_MATCH";
  jobId: string;
  jobTitle: string;
  category: string;
  company: string;
  score?: number | null;
  rank?: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
  computedAt: string;
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    age?: number;
    education?: string;
    fieldOfStudy?: string;
    isStudent?: boolean;
    phone?: string;
  };
  resume: {
    id: string;
    fileName: string;
    fileUrl: string;
    targetRole?: string;
    experienceYears?: number;
    skills: string[];
  };
};

const APPLICANTS_PER_PAGE = 8;

function formatApplicantScore(applicant: Applicant) {
  if (applicant.type === "DIRECT_APPLICATION" && applicant.score == null) {
    return "Applied";
  }
  return `${(applicant.score ?? 0).toFixed(2)}%`;
}

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [previewApplicant, setPreviewApplicant] = useState<Applicant | null>(null);

  const getApplicantResumeUrl = (applicant: Applicant, mode: "view" | "download") => {
    const kind = applicant.type === "DIRECT_APPLICATION" ? "application" : "resume";
    return `/api/recruiter/applicants/resume?kind=${kind}&id=${encodeURIComponent(applicant.resume.id)}&mode=${mode}`;
  };

  const fetchApplicants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/recruiter/applicants", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load applicants");
      setApplicants(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load applicants");
      setApplicants([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(applicants.map((a) => a.category).filter(Boolean));
    return ["All", ...Array.from(cats).sort()];
  }, [applicants]);

  const filteredApplicants = useMemo(() => {
    return applicants.filter((a) => {
      const search = searchQuery.toLowerCase();
      const userName = (a.user.name || `${a.user.firstName || ""} ${a.user.lastName || ""}`).toLowerCase();
      const jobTitle = a.jobTitle.toLowerCase();
      const company = a.company.toLowerCase();
      
      const matchesSearch = userName.includes(search) || jobTitle.includes(search) || company.includes(search);
      const matchesCategory = selectedCategory === "All" || a.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [applicants, searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredApplicants.length / APPLICANTS_PER_PAGE);
  const paginatedApplicants = useMemo(() => {
    const start = (currentPage - 1) * APPLICANTS_PER_PAGE;
    return filteredApplicants.slice(start, start + APPLICANTS_PER_PAGE);
  }, [filteredApplicants, currentPage]);

  return (
    <div className="main-gradient min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/recruiter" className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">All Applicants</h1>
            <p className="text-sm text-slate-500">Managing {applicants.length} candidates across all active job postings.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates, jobs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <Button variant="secondary" onClick={fetchApplicants} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Category Navigation (Dynamic) */}
        {!isLoading && categories.length > 2 && (
          <div className="mb-8 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-2 min-w-max px-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shadow-sm border ${
                    selectedCategory === cat
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200"
                      : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
               <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
               <p className="mt-4 text-sm font-medium text-slate-600">Loading all applicants...</p>
            </div>
          )}

          {!isLoading && applicants.length === 0 && (
            <Card className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="h-12 w-12 text-slate-200 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No applicants yet</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">Once seekers apply to your jobs, they will appear here in a unified list.</p>
              <Button asChild className="mt-6">
                <Link href="/jobs/new">Post a New Job</Link>
              </Button>
            </Card>
          )}

          {!isLoading && applicants.length > 0 && filteredApplicants.length === 0 && (
            <Card className="py-20 text-center text-slate-500">
              <p>No matches found for "{searchQuery}"</p>
            </Card>
          )}

          {!isLoading && paginatedApplicants.map((a) => (
            <Card key={a.matchId} hover className="overflow-hidden border-slate-100 transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                {/* Profile Section */}
                <div className="flex flex-1 items-start gap-4">
                  <div className="relative">
                    {a.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.user.image} alt={a.user.name || "candidate"} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white" />
                    ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/20">
                            {(a.user.firstName?.[0] ?? a.user.name?.[0] ?? "U").toUpperCase()}
                        </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-emerald-500 ring-2 ring-emerald-500/10"></div>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 truncate">
                        {a.user.firstName || a.user.lastName
                            ? `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim()
                            : a.user.name ?? "Anonymous"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 text-indigo-600 font-medium whitespace-nowrap">
                        <Users className="h-3 w-3" /> {a.resume.targetRole || "Candidate"}
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <MapPin className="h-3 w-3" /> {a.user.city ?? "Location N/A"}
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <GraduationCap className="h-3 w-3" /> {a.user.education ?? "Education N/A"}
                      </span>
                    </div>
                    {/* Applied To Badge */}
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Applied For:</span>
                        <div className="inline-flex items-center rounded-lg bg-slate-50 px-2 py-1 text-xs border border-slate-100">
                           <span className="font-semibold text-slate-700">{a.jobTitle}</span>
                           <span className="mx-1.5 h-3 w-[1px] bg-slate-200"></span>
                           <span className="text-slate-500">{a.company}</span>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-6 border-t border-slate-50 pt-4 md:border-none md:pt-0">
                  <div className="flex flex-col items-center gap-1">
                    {a.type === "DIRECT_APPLICATION" && a.score == null ? (
                      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Applied
                      </div>
                    ) : (
                      <CircularScore value={a.score ?? 0} className="scale-90" />
                    )}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {formatApplicantScore(a)}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <Button 
                      className="h-9 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20" 
                      onClick={() => setPreviewApplicant(a)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> View Resume
                    </Button>
                    <div className="flex items-center justify-between px-1">
                        <a href={`mailto:${a.user.email}`} className="text-slate-400 hover:text-indigo-600 transition-colors hint--bottom" aria-label="Email Candidate">
                            <Mail className="h-4 w-4" />
                        </a>
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors" title="Call Candidate">
                            <Phone className="h-4 w-4" />
                        </button>
                        <a
                          href={getApplicantResumeUrl(a, "download")}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Download CV"
                        >
                            <Download className="h-4 w-4" />
                        </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Tags */}
              <div className="mt-5 flex flex-wrap gap-1.5 border-t border-slate-50 pt-4">
                {a.matchedSkills.slice(0, 6).map((skill) => (
                  <span key={skill} className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                    {skill}
                  </span>
                ))}
                {a.resume.skills.slice(0, 4).map((skill) => (
                  !a.matchedSkills.includes(skill) && (
                    <span key={skill} className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-100">
                        {skill}
                    </span>
                  )
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-xl"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-9 w-9 rounded-xl text-sm font-semibold transition-all ${
                    currentPage === i + 1 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                      : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl"
            >
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Resume Preview Modal */}
        {previewApplicant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
            <Card className="relative flex flex-col h-full w-full max-w-5xl shadow-2xl p-0 overflow-hidden border-indigo-100 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50 bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-indigo-50 rounded-lg">
                      <FileText className="h-5 w-5 text-indigo-600" />
                   </div>
                   <h3 className="font-semibold text-slate-900">Resume Preview</h3>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" size="sm" asChild>
                    <a href={getApplicantResumeUrl(previewApplicant, "download")} target="_blank" rel="noreferrer">
                      <Download className="mr-2 h-4 w-4" /> Download
                    </a>
                  </Button>
                  <Button variant="secondary" size="sm" asChild>
                    <a href={getApplicantResumeUrl(previewApplicant, "view")} target="_blank" rel="noreferrer">
                      <Eye className="mr-2 h-4 w-4" /> Open Original
                    </a>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPreviewApplicant(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 bg-slate-50 relative">
                <div className="absolute left-4 right-4 top-4 z-10 rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-xs text-amber-800 shadow-sm">
                  Inline resume preview can fail for some protected PDF providers and mobile browsers.
                  If that happens, use <span className="font-semibold">Download</span> or <span className="font-semibold">Open Original</span> for now, and we can harden the in-browser viewer in a future update.
                </div>
                <iframe
                  src={getApplicantResumeUrl(previewApplicant, "view")}
                  className="h-full w-full border-none"
                  title="Resume Preview"
                />
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
