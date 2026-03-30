import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site-url";

export const revalidate = 3600;

type SitemapJob = {
  id: string;
  postedAt?: string;
  isActive?: boolean;
};

const STATIC_ROUTES: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/jobs", changeFrequency: "daily", priority: 0.9 },
];

function readPublicJobs(): SitemapJob[] {
  try {
    const filePath = path.join(process.cwd(), "data", "jobs.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const jobs = JSON.parse(raw) as SitemapJob[];
    return jobs.filter((job) => Boolean(job.id) && job.isActive !== false);
  } catch {
    return [];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const jobEntries: MetadataRoute.Sitemap = readPublicJobs().map((job) => ({
    url: `${SITE_URL}/jobs/${job.id}`,
    lastModified: job.postedAt ? new Date(job.postedAt) : now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticEntries, ...jobEntries];
}
