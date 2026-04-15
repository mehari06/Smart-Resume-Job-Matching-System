"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Navbar } from "../../../components/Navbar";

function getDefaultDestination(role: string | undefined, intent: string | null) {
    if (role === "ADMIN") return "/admin/dashboard";
    if (role === "RECRUITER" && intent === "SEEKER") return "/dashboard";
    if (role === "RECRUITER") return "/recruiter";
    return "/dashboard";
}

function AuthCompleteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status !== "authenticated") return;

        const role = (session?.user as any)?.role as string | undefined;
        const intent = searchParams.get("intent");
        router.replace(getDefaultDestination(role, intent));
    }, [router, searchParams, session, status]);

    return (
        <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-4 text-sm text-slate-600">Finalizing your sign-in and routing you to the right workspace...</p>
        </main>
    );
}

function AuthCompleteFallback() {
    return (
        <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-4 text-sm text-slate-600">Preparing your workspace...</p>
        </main>
    );
}

export default function AuthCompletePage() {
    return (
        <div className="main-gradient min-h-screen">
            <Navbar />
            <Suspense fallback={<AuthCompleteFallback />}>
                <AuthCompleteContent />
            </Suspense>
        </div>
    );
}
