import type { JobMatch, RecruiterMatch, ResumeSummary } from "../types";

export const resumeSummary: ResumeSummary = {
  candidateName: "Ariana Gomez",
  targetRole: "Product Designer",
  experienceYears: 4,
  skills: ["Figma", "Design Systems", "React", "Accessibility", "UX Research"],
  strongestMatchReason: "Strong overlap in design systems and frontend collaboration skills."
};

export const jobMatches: JobMatch[] = [
  {
    jobId: "job-001",
    rank: 1,
    jobTitle: "Senior Product Designer",
    company: "Nova Mobility",
    similarityScore: 87,
    matchedSkills: ["Design Systems", "Figma", "Accessibility", "Prototyping"],
    missingSkills: ["Design QA"]
  },
  {
    jobId: "job-002",
    rank: 2,
    jobTitle: "UX Lead",
    company: "Atlas Health",
    similarityScore: 82,
    matchedSkills: ["Research", "Usability Testing", "Journey Mapping"],
    missingSkills: ["Analytics"]
  },
  {
    jobId: "job-003",
    jobTitle: "UI Engineer",
    company: "Brightline",
    rank: 3,
    similarityScore: 76,
    matchedSkills: ["React", "TypeScript", "Component Libraries"],
    missingSkills: ["Testing"]
  },
  {
    jobId: "job-004",
    rank: 4,
    jobTitle: "Product Designer",
    company: "Signal Ridge",
    similarityScore: 71,
    matchedSkills: ["Wireframing", "Design QA", "Stakeholder Communication"],
    missingSkills: ["Prototyping"]
  },
  {
    jobId: "job-005",
    rank: 5,
    jobTitle: "Experience Designer",
    company: "Hearth Labs",
    similarityScore: 65,
    matchedSkills: ["Service Design", "User Interviews", "Information Architecture"],
    missingSkills: ["Workshop Facilitation"]
  }
];

export const recruiterMatches: RecruiterMatch[] = [
  {
    id: "r1",
    name: "Ariana Gomez",
    matchScore: 89,
    topSkills: ["Design Systems", "Figma", "Accessibility"]
  },
  {
    id: "r2",
    name: "Leila Mensah",
    matchScore: 81,
    topSkills: ["UX Research", "Interviewing", "A/B Testing"]
  },
  {
    id: "r3",
    name: "Noah Park",
    matchScore: 73,
    topSkills: ["React", "TypeScript", "UI Architecture"]
  },
  {
    id: "r4",
    name: "Tariq Sule",
    matchScore: 67,
    topSkills: ["Customer Journey", "Service Design", "Facilitation"]
  }
];
