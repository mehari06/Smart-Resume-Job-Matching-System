"use client";

import Link from "next/link";
import { Search, Home, ArrowLeft } from "lucide-react";
import { Button } from "../components/Button";
import { Navbar } from "../components/Navbar";

export default function NotFound() {
    return (
        <div className="main-gradient min-h-screen">
            <Navbar />
            <main className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-32 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Search className="h-10 w-10" />
                </div>
                <h1 className="mt-8 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">404 - Page Not Found</h1>
                <p className="mt-4 text-lg text-slate-600">
                    The page you are looking for doesn't exist or has been moved.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                    <Button asChild onClick={() => window.history.back()}>
                        <button className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" /> Go Back
                        </button>
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
