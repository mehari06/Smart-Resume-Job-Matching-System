import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "../components/providers/AuthProvider";
import { QueryProvider } from "../components/providers/QueryProvider";
import { GoogleAnalytics } from "../components/GoogleAnalytics";
import { AppStateProvider } from "../components/AppStateProvider";
import dynamic from "next/dynamic";

const Toaster = dynamic(() => import("sonner").then((mod) => mod.Toaster), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Smart Resume – AI Job Matching",
    template: "%s | Smart Resume",
  },
  description:
    "Intelligent resume-to-job matching using TF-IDF and cosine similarity. Find your top 5 job matches with transparent scoring.",
  keywords: ["resume matching", "job search", "AI matching", "Ethiopia jobs", "Afriwork", "career"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "Smart Resume",
    title: "Smart Resume – AI Job Matching",
    description: "Intelligent resume-to-job matching for African job seekers.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <QueryProvider>
            <AppStateProvider>
              {children}
              <Toaster position="bottom-right" richColors closeButton />
            </AppStateProvider>
          </QueryProvider>
        </AuthProvider>
        <GoogleAnalytics trackingId={process.env.NEXT_PUBLIC_GA_ID || ""} />
      </body>
    </html>
  );
}
