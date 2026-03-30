import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { buildMetadata } from "../components/SEO";
import {
  StructuredData,
  buildSoftwareApplicationSchema,
  buildWebsiteSchema,
} from "../components/StructuredData";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "AI Resume Matching Platform",
    description:
      "Upload your resume and discover your best-fit jobs with transparent AI scoring and explainable match insights.",
    path: "/",
  }),
};

const steps = [
  {
    title: "Secure Login",
    description: "01 - Access your professional dashboard with secure, encrypted authentication.",
  },
  {
    title: "Find Your Role",
    description: "02 - Browse our local and international job pool to find the perfect professional target.",
  },
  {
    title: "Upload and Match",
    description: "03 - Upload your resume (max 10MB). Our AI instantly calculates your alignment with the role.",
  },
];

export default function LandingPage() {
  return (
    <div className="main-gradient min-h-screen">
      <Navbar />
      <main id="main-content">
        <StructuredData id="website-schema" data={buildWebsiteSchema()} />
        <StructuredData id="software-schema" data={buildSoftwareApplicationSchema()} />

        <header className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:items-center lg:px-8">
          <div>
            <p className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Smart Career Analytics Powered by AI Matching
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Match Your Resume With The Right Job
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Smart Resume transforms your career history into ranked opportunities. We use advanced alignment
              analytics to show you exactly where you fit best.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Upload Resume
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/jobs">Explore Jobs</Link>
              </Button>
            </div>
          </div>
        </header>

        <section id="how-it-works" aria-labelledby="how-it-works-title" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 id="how-it-works-title" className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-3 text-slate-600">Three focused steps, one confident outcome.</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <article>
                  <Card hover>
                    <span className="text-sm font-semibold text-indigo-600">0{index + 1}</span>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                  </Card>
                </article>
              </li>
            ))}
          </ol>
        </section>

        <section id="security" aria-labelledby="security-title" className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <h2 id="security-title" className="text-3xl font-semibold tracking-tight text-slate-900">
                Security and Privacy by Design
              </h2>
              <p className="mt-3 max-w-xl text-slate-600">
                Your files are processed securely, with strict file type validation and role-based visibility controls.
              </p>
            </div>
            <ul className="grid gap-3">
              <li>
                <Card className="flex items-center gap-3 p-4">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  <p className="text-sm text-slate-700">Secure encrypted uploads for every resume and job description.</p>
                </Card>
              </li>
              <li>
                <Card className="flex items-center gap-3 p-4">
                  <Lock className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                  <p className="text-sm text-slate-700">Privacy-first controls with transparent, explainable scoring.</p>
                </Card>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
