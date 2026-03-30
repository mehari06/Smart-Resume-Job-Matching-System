import * as Sentry from "@sentry/nextjs";

function isSentryEnabled() {
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export async function sentryCaptureServerException(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> }
) {
  if (!isSentryEnabled()) return;

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

export async function sentryCaptureServerMessage(
  message: string,
  options?: {
    level?: "fatal" | "error" | "warning" | "log" | "info" | "debug";
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
) {
  if (!isSentryEnabled()) return;

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
