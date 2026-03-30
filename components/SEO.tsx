import type { Metadata } from "next";
import { SITE_URL, SITE_URL_OBJECT } from "../lib/site-url";

type OpenGraphType = "website" | "article";

export type SEOConfig = {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
  type?: OpenGraphType;
};

const DEFAULT_TITLE = "Smart Resume - AI Job Matching";
const DEFAULT_DESCRIPTION =
  "Intelligent resume-to-job matching using TF-IDF and cosine similarity with transparent scoring.";
const DEFAULT_IMAGE = "/og-image.svg";
const DEFAULT_KEYWORDS = [
  "resume matching",
  "job search",
  "AI matching",
  "career platform",
  "recruitment",
];

function normalizePath(path = "/"): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getAbsoluteUrl(path = "/"): string {
  return `${SITE_URL}${normalizePath(path)}`;
}

export function buildMetadata(config: SEOConfig = {}): Metadata {
  const title = config.title ?? DEFAULT_TITLE;
  const description = config.description ?? DEFAULT_DESCRIPTION;
  const path = normalizePath(config.path ?? "/");
  const image = config.image ?? DEFAULT_IMAGE;
  const keywords = config.keywords ?? DEFAULT_KEYWORDS;
  const isNoIndex = Boolean(config.noIndex);
  const type = config.type ?? "website";

  return {
    metadataBase: SITE_URL_OBJECT,
    title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    robots: {
      index: !isNoIndex,
      follow: !isNoIndex,
      googleBot: {
        index: !isNoIndex,
        follow: !isNoIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type,
      url: path,
      title,
      description,
      siteName: "Smart Resume",
      locale: "en_US",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
