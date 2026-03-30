"use client";

import { useEffect } from "react";
import { serializeError } from "../lib/monitoring-client";
import { sentryCaptureClientException } from "../lib/sentry-client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void sentryCaptureClientException(error, {
      tags: {
        source: "frontend",
        type: "global_error_boundary",
      },
      extra: {
        digest: error.digest,
        error: serializeError(error),
      },
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-sm text-slate-600">
            We have logged this issue. Please try again.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
