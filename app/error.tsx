"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "../components/Button";
import { Navbar } from "../components/Navbar";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to Sentry/Console
        console.error(error);
    }, [error]);

    return (
        <div className="main-gradient min-h-screen">
            <Navbar />
            <main className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-32 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <AlertTriangle className="h-10 w-10" />
                </div>
                <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Something went wrong</h1>
                <p className="mt-4 text-lg text-slate-600">
                    An unexpected error occurred. We've been notified and are working on it.
                </p>
                <p className="mt-2 text-sm text-slate-400 italic">
                    {error.message || "Error ID: " + (error.digest ?? "unknown")}
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                    <Button onClick={() => reset()} className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" /> Try Again
                    </Button>
                    <Button variant="secondary" asChild>
                        <Link href="/" className="flex items-center gap-2">
                            <Home className="h-4 w-4" /> Return Home
                        </Link>
                    </Button>
                </div>
            </main>
        </div>
    );
}
