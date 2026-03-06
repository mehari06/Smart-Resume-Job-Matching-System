import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Browse Jobs",
    description: "Browse all job listings from Afriwork, Ethiojobs, Shega Insights and more. Filter by category, experience level, and job type.",
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
