"use client";

import { useEffect } from "react";
import { serializeError } from "../../lib/monitoring-client";
import { sentryCaptureClientException, sentryCaptureClientMessage } from "../../lib/sentry-client";

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void sentryCaptureClientException(event.error ?? new Error(event.message), {
        tags: {
          source: "frontend",
          type: "window.error",
        },
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      void sentryCaptureClientException(
        event.reason instanceof Error ? event.reason : new Error("Unhandled promise rejection"),
        {
          tags: {
            source: "frontend",
            type: "unhandledrejection",
          },
          extra: {
            reason: serializeError(event.reason),
          },
        }
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (navigationEntry) {
      void sentryCaptureClientMessage("Navigation timing captured", {
        level: "info",
        tags: {
          source: "frontend",
          type: "navigation_timing",
        },
        extra: {
          domCompleteMs: Math.round(navigationEntry.domComplete),
          domInteractiveMs: Math.round(navigationEntry.domInteractive),
          loadEventEndMs: Math.round(navigationEntry.loadEventEnd),
        },
      });
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}
