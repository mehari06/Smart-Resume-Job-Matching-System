import { cache } from "react";
import {
  getAllJobs,
  getAllResumes,
  getJobById,
  getMatchesByResumeId,
  getResumeById,
  getResumesByUserId,
} from "./data";

/**
 * Request-scoped React cache wrappers for Server Components.
 * This avoids duplicate fetch/work in the same render cycle
 * (for example, generateMetadata + page body).
 */
export const getAllJobsCached = cache(async () => getAllJobs());
export const getJobByIdCached = cache(async (id: string) => getJobById(id));
export const getAllResumesCached = cache(async () => getAllResumes());
export const getResumeByIdCached = cache(async (id: string) => getResumeById(id));
export const getResumesByUserIdCached = cache(async (userId: string) => getResumesByUserId(userId));
export const getMatchesByResumeIdCached = cache(async (resumeId: string) => getMatchesByResumeId(resumeId));
