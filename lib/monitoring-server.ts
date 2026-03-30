import type { MonitoringEvent } from "./monitoring";
import { normalizeMonitoringEvent } from "./monitoring";
import { sentryCaptureServerException, sentryCaptureServerMessage } from "./sentry-server";

function getMonitoringBackendUrl() {
  const raw = process.env.MONITORING_BACKEND_URL?.trim();
  if (!raw) return null;
  const base = raw.replace(/\/$/, "");
  return base.endsWith("/monitoring/events") ? base : `${base}/monitoring/events`;
}

async function forwardToBackend(event: MonitoringEvent) {
  const target = getMonitoringBackendUrl();
  if (!target) return;

  const apiKey = process.env.MONITORING_BACKEND_API_KEY?.trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify(event),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    console.warn("[monitoring] failed to forward event to backend", error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function recordServerEvent(event: MonitoringEvent) {
  const normalized = normalizeMonitoringEvent({
    ...event,
    source: event.source ?? "next-api",
  });

  const level = normalized.level ?? "info";
  const message = normalized.message ?? normalized.type;
  const payload = JSON.stringify(normalized);

  if (level === "error") {
    console.error(`[monitoring] ${message} ${payload}`);
    await sentryCaptureServerMessage(message, {
      level: "error",
      tags: {
        source: normalized.source,
        type: normalized.type,
      },
      extra: normalized.metadata,
    });
  } else if (level === "warning") {
    console.warn(`[monitoring] ${message} ${payload}`);
    await sentryCaptureServerMessage(message, {
      level: "warning",
      tags: {
        source: normalized.source,
        type: normalized.type,
      },
      extra: normalized.metadata,
    });
  } else {
    console.info(`[monitoring] ${message} ${payload}`);
  }

  await forwardToBackend(normalized);
}

export async function recordServerError(params: {
  type: string;
  message: string;
  path?: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
}) {
  const errorDetails =
    params.error instanceof Error
      ? {
          name: params.error.name,
          message: params.error.message,
          stack: params.error.stack,
        }
      : params.error
        ? { value: String(params.error) }
        : undefined;

  await recordServerEvent({
    source: "next-api",
    type: params.type,
    level: "error",
    message: params.message,
    path: params.path,
    metadata: {
      ...(params.metadata ?? {}),
      ...(errorDetails ? { error: errorDetails } : {}),
    },
  });

  if (params.error) {
    await sentryCaptureServerException(params.error, {
      tags: {
        source: "next-api",
        type: params.type,
      },
      extra: {
        path: params.path,
        ...(params.metadata ?? {}),
      },
    });
  }
}
