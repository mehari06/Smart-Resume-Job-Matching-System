import "./globals.css";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { AuthProvider } from "../components/providers/AuthProvider";
import { QueryProvider } from "../components/providers/QueryProvider";
import { MonitoringProvider } from "../components/providers/MonitoringProvider";
import { GoogleAnalytics } from "../components/GoogleAnalytics";
import { AppStateProvider } from "../components/AppStateProvider";
import { buildMetadata } from "../components/SEO";
import { StructuredData, buildOrganizationSchema } from "../components/StructuredData";

const Toaster = dynamic(() => import("sonner").then((mod) => mod.Toaster), { ssr: false });

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Smart Resume - AI Job Matching",
    description:
      "Intelligent resume-to-job matching using TF-IDF and cosine similarity. Find your top job matches with transparent scoring.",
    path: "/",
    keywords: ["resume matching", "job search", "AI matching", "Ethiopia jobs", "Afriwork", "career"],
  }),
  applicationName: "Smart Resume",
  title: {
    default: "Smart Resume - AI Job Matching",
    template: "%s | Smart Resume",
  },
  category: "technology",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-slate-900"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <QueryProvider>
            <MonitoringProvider>
              <AppStateProvider>
                <StructuredData id="org-schema" data={buildOrganizationSchema()} />
                {children}
                <Toaster position="bottom-right" richColors closeButton />
              </AppStateProvider>
            </MonitoringProvider>
          </QueryProvider>
        </AuthProvider>
        <GoogleAnalytics trackingId={process.env.NEXT_PUBLIC_GA_ID || ""} />
      </body>
    </html>
  );
}
