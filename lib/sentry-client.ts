"use client";

import * as Sentry from "@sentry/nextjs";

export async function sentryCaptureClientException(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> }
) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (context?.tags || context?.extra) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context.tags ?? {})) {
        scope.setTag(key, value);
      }
      for (const [key, value] of Object.entries(context.extra ?? {})) {
        scope.setExtra(key, value);
      }
      Sentry.captureException(error);
    });
    return;
  }

  Sentry.captureException(error);
}

export async function sentryCaptureClientMessage(
  message: string,
  options?: {
    level?: "fatal" | "error" | "warning" | "log" | "info" | "debug";
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (options?.tags || options?.extra) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(options.tags ?? {})) {
        scope.setTag(key, value);
      }
      for (const [key, value] of Object.entries(options.extra ?? {})) {
        scope.setExtra(key, value);
      }
      Sentry.captureMessage(message, options.level ?? "info");
    });
    return;
  }

  Sentry.captureMessage(message, options?.level ?? "info");
}
