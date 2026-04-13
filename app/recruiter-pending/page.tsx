"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Loader2, Shield } from "lucide-react";

export default function RecruiterPendingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [dots, setDots] = useState(".");
  const [approved, setApproved] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // If session already has RECRUITER role, go directly to the portal
  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role === "RECRUITER") {
      router.replace("/recruiter");
    }
  }, [status, session, router]);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Poll for approval every 5 seconds
  useEffect(() => {
    if (status !== "authenticated") return;

    const poll = async () => {
      try {
        const res = await fetch("/api/recruiter/request-access");
        const data = await res.json();

        if (data.approvalStatus === "APPROVED" || data.role === "RECRUITER") {
          setApproved(true);
          // Force session refresh so the JWT picks up the new role
          await update();
          // Wait a moment for the session to propagate, then redirect
          setTimeout(() => {
            router.push("/recruiter");
          }, 2000);
          return true; // Stop polling
        }

        if (data.approvalStatus === "REJECTED") {
          router.push("/dashboard?error=rejected");
          return true;
        }
      } catch (e) {
        // Silently retry
      }
      return false;
    };

    // Run immediately then on interval
    poll();
    const interval = setInterval(async () => {
      const done = await poll();
      if (done) clearInterval(interval);
      setPollCount((c) => c + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [status, update, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">

        {/* Animated Icon */}
        <div className="flex justify-center">
          {approved ? (
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
          ) : (
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-40" />
              <div className="relative w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
                <Clock className="w-12 h-12 text-indigo-500" />
              </div>
            </div>
          )}
        </div>

        {/* Text */}
        {approved ? (
          <>
            <div>
              <h1 className="text-3xl font-bold text-emerald-700 mb-2">You're Approved! 🎉</h1>
              <p className="text-slate-600 text-lg">
                Redirecting you to the Recruiter Portal{dots}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Setting up your account</span>
            </div>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">We've Got Your Request!</h1>
              <p className="text-slate-500 text-lg leading-relaxed">
                Your recruiter access request is being reviewed by an admin.
                We'll notify you as soon as it's approved.
              </p>
            </div>

            {/* Status indicator */}
            <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Request Submitted</p>
                  <p className="text-xs text-slate-500">Your request has been received</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Admin Review{dots}</p>
                  <p className="text-xs text-slate-500">An admin is reviewing your account</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left opacity-40">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">Recruiter Access</p>
                  <p className="text-xs text-slate-400">Pending approval</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              This page checks automatically every few seconds.
              No need to refresh!
            </p>

            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
