// ==========================================
// Core domain types for Smart Resume system
// ==========================================

export type Role = "jobSeeker" | "recruiter" | "admin";
export type UserRole = "SEEKER" | "RECRUITER" | "ADMIN";

export type JobType = "Full-time" | "Part-time" | "Contract" | "Remote" | "Research Contract";
export type ExperienceLevel = "Entry-level" | "Junior" | "Mid-level" | "Senior";
export type JobSource = "Afriwork" | "Ethiojobs" | "Shega Insights" | "Hugging Face" | "Internal";

// ─── Job ──────────────────────────────────────────────────────────────────────
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: JobType;
  salary?: string;
  description: string;
  skills: string[];
  source: JobSource;
  category: string;
  experience: ExperienceLevel;
  postedAt: string;
  deadline?: string;
  applicants?: number;
}

// ─── Resume ───────────────────────────────────────────────────────────────────
export interface Resume {
  id: string;
  userId: string;
  candidateName: string;
  email?: string;
  targetRole?: string;
  experienceYears?: number;
  education?: string;
  skills: string[];
  experience?: Array<{ title: string; company: string; years: number }>;
  summary?: string;
  parsedText?: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

// ─── Match ────────────────────────────────────────────────────────────────────
export interface JobMatch {
  jobId: string;
  jobTitle: string;
  company: string;
  similarityScore: number;
  rank: number;
  matchedSkills: string[];
  missingSkills: string[];
  explanation?: string;
}

export interface MatchResult {
  resumeId: string;
  candidateName: string;
  targetRole?: string;
  matches: JobMatch[];
  computedAt: string;
  algorithm: string;
}

// ─── User / Auth ──────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  role: UserRole;
  createdAt?: string;
}

// ─── Legacy / UI types (kept for existing pages) ──────────────────────────────
/** @deprecated Use JobMatch instead */
export interface LegacyJobMatch {
  id: string;
  rank: number;
  jobTitle: string;
  company: string;
  similarityScore: number;
  matchedSkills: string[];
}

/** @deprecated Use Resume instead */
export interface ResumeSummary {
  candidateName: string;
  targetRole: string;
  experienceYears: number;
  skills: string[];
  strongestMatchReason: string;
}

/** @deprecated Use JobMatch from recruiter perspective */
export interface RecruiterMatch {
  id: string;
  name: string;
  matchScore: number;
  topSkills: string[];
}

// ─── API Response wrappers ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Filter / Sort ─────────────────────────────────────────────────────────────
export interface JobFilters {
  search?: string;
  category?: string;
  source?: JobSource;
  experience?: ExperienceLevel;
  type?: JobType;
}

export interface JobSort {
  field: "postedAt" | "applicants" | "title";
  direction: "asc" | "desc";
}
