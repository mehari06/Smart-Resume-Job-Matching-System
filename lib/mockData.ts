import type { ResumeSummary } from "../types";

export const resumeSummary: ResumeSummary = {
  candidateName: "Candidate",
  targetRole: "Software Engineer",
  experienceYears: 3,
  skills: ["TypeScript", "React", "Node.js"],
  strongestMatchReason: "Strong overlap in core frontend and backend engineering skills.",
};

export const jobMatches = [
  {
    jobId: "demo-job-1",
    jobTitle: "Frontend Engineer",
    company: "Smart Resume",
    similarityScore: 88,
    rank: 1,
    matchedSkills: ["React", "TypeScript", "Tailwind CSS"],
    missingSkills: ["GraphQL"],
    explanation: "Strong frontend stack alignment.",
  },
  {
    jobId: "demo-job-2",
    jobTitle: "Full Stack Developer",
    company: "Tech Hub",
    similarityScore: 81,
    rank: 2,
    matchedSkills: ["Node.js", "TypeScript", "API Design"],
    missingSkills: ["Docker"],
    explanation: "Good full stack skill overlap.",
  },
  {
    jobId: "demo-job-3",
    jobTitle: "Product Engineer",
    company: "Innovation Labs",
    similarityScore: 74,
    rank: 3,
    matchedSkills: ["React", "Problem Solving", "Testing"],
    missingSkills: ["Kubernetes"],
    explanation: "Solid product-focused engineering fit.",
  },
];
