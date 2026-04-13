"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CheckCircle2, Chrome, User } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Navbar } from "../../components/Navbar";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<"SEEKER" | "RECRUITER">("SEEKER");

  const callbackUrl = role === "RECRUITER" ? "/recruiter" : "/dashboard";
  const error = searchParams.get("error");

  useEffect(() => {
    // If we were redirected here due to a role mismatch, keep the user on this page
    // so they can choose a different account.
    if (status === "authenticated" && !error) {
      router.replace("/dashboard");
    }
  }, [status, router, error]);

  const handleGoogle = () => {
    startTransition(() => {
      signIn("google", { callbackUrl, redirect: true });
    });
  };

  return (
    <div className="main-gradient min-h-screen">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome to Smart Resume</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to access your personalised job matching dashboard.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Note: Recruiter access is granted by server-side allowlist (email/domain) or an admin-set role.
          </p>

          {error === "insufficient_role" && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              That page requires a Recruiter account. Please sign in with a recruiter role.
            </div>
          )}

          <div className="mt-6 space-y-4">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-2">
                {(["SEEKER", "RECRUITER"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition ${role === r
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {r === "SEEKER" ? (
                        <User className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      {r === "SEEKER" ? "Job Seeker" : "Recruiter"}
                      {role === r && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Google OAuth */}
            <Button
              className="w-full"
              variant="secondary"
              onClick={handleGoogle}
              loading={isPending}
              aria-label="Continue with Google OAuth"
            >
              <Chrome className="h-4 w-4" aria-hidden="true" />
              Continue with Google
            </Button>

            <p className="text-center text-xs text-slate-500">
              By continuing, you agree to our{" "}
              <Link href="#" className="underline hover:text-slate-700">Terms</Link>{" "}
              and{" "}
              <Link href="#" className="underline hover:text-slate-700">Privacy Policy</Link>.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="main-gradient min-h-screen">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full max-w-xl">
          <p className="text-sm text-slate-600">Loading login options...</p>
        </Card>
      </main>
    </div>
  );
}
