"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Chrome, Mail, Loader2 } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Navbar } from "../../components/Navbar";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"SEEKER" | "RECRUITER">("SEEKER");
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") ?? (role === "RECRUITER" ? "/recruiter" : "/dashboard");
  const error = searchParams.get("error");

  const handleGoogle = () => {
    startTransition(() => {
      signIn("google", { callbackUrl });
    });
  };

  const handleEmailLogin = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsEmailLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        role,
        redirect: false,
        callbackUrl,
      });
      if (result?.ok) {
        toast.success("Signed in successfully!");
        router.push(callbackUrl);
        router.refresh();
      } else {
        toast.error("Sign in failed. Please try again.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsEmailLoading(false);
    }
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
                    {r === "SEEKER" ? "🎯 Job Seeker" : "🏢 Recruiter"}
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

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs uppercase tracking-wide text-slate-400">or email (dev only)</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Email/Dev login */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleEmailLogin}
              disabled={isEmailLoading}
            >
              {isEmailLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
              ) : (
                <><Mail className="h-4 w-4" /> Continue as {role === "SEEKER" ? "Job Seeker" : "Recruiter"}</>
              )}
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
