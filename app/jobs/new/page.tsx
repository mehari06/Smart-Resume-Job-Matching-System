import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "../../../components/Navbar";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { JobPostForm } from "../../../components/JobPostForm";

export const metadata = {
    title: "Post New Job",
    description: "Create a new job listing for Smart Resume.",
};

export default function NewJobPage() {
    return (
        <div className="main-gradient min-h-screen">
            <Navbar />
            <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Post New Job</h1>
                        <p className="mt-2 text-slate-600">
                            Create a recruiter job listing that persists to the Smart Resume job database.
                        </p>
                    </div>
                    <Button asChild variant="secondary">
                        <Link href="/recruiter">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Recruiter Portal
                        </Link>
                    </Button>
                </div>

                <Card className="mb-6 border-indigo-100 bg-gradient-to-r from-indigo-50 to-white">
                    <p className="text-sm text-slate-700">
                        This page is intended for recruiter and admin accounts. Job creation is validated again on the API.
                    </p>
                </Card>

                <JobPostForm />
            </main>
        </div>
    );
}
