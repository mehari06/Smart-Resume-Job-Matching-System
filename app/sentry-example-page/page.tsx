"use client";

import { useState } from "react";
import { Button } from "../../components/Button";

export default function SentryExamplePage() {
  const [hasTriggered, setHasTriggered] = useState(false);

  const triggerError = () => {
    setHasTriggered(true);
    throw new Error("Sentry example page test error");
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Sentry Check
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Trigger a Test Error
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use this page after deployment to confirm that frontend errors are reaching Sentry.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={triggerError}>
            {hasTriggered ? "Triggering..." : "Throw Test Error"}
          </Button>
        </div>
      </div>
    </main>
  );
}
