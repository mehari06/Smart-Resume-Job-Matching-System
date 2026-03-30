import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site-url";

export const revalidate = 3600;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth",
          "/dashboard",
          "/login",
          "/matches",
          "/profile",
          "/recruiter",
          "/upload",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
