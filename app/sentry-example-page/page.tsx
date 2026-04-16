"use client";

import { useState } from "react";
import { Button } from "../../components/Button";
import { sentryCaptureClientException } from "../../lib/sentry-client";

export default function SentryExamplePage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const triggerError = async () => {
    setStatus("sending");

    try {
      const error = new Error("Sentry example page test error");
      await sentryCaptureClientException(error, {
        tags: {
          source: "sentry_example_page",
          type: "manual_test",
        },
        extra: {
          triggeredAt: new Date().toISOString(),
        },
      });
      setStatus("sent");
    } catch {
      setStatus("idle");
    }
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
          Use this page after deployment to confirm that frontend events are reaching Sentry
          without crashing the page.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={triggerError}>
            {status === "sending"
              ? "Sending Test Event..."
              : status === "sent"
                ? "Sent to Sentry"
                : "Send Test Error"}
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Expected result: this page stays open, and you should see a new issue in Sentry.
        </p>
      </div>
    </main>
  );
}
