"use client";

import type { MonitoringEvent } from "./monitoring";
import { normalizeMonitoringEvent } from "./monitoring";

const MONITORING_ENDPOINT = "/api/monitoring/events";

function canUseBeacon() {
  return typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function";
}

function getClientMetadata() {
  if (typeof window === "undefined") return {};

  return {
    href: window.location.href,
    userAgent: navigator.userAgent,
    language: navigator.language,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  try {
    return { value: JSON.stringify(error) };
  } catch {
    return { value: String(error) };
  }
}

export function reportClientEvent(event: MonitoringEvent) {
  if (typeof window === "undefined") return;

  const normalized = normalizeMonitoringEvent({
    ...event,
    source: "frontend",
    metadata: {
      ...getClientMetadata(),
      ...(event.metadata ?? {}),
    },
  });

  const body = JSON.stringify(normalized);

  if (canUseBeacon()) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(MONITORING_ENDPOINT, blob);
    return;
  }

  fetch(MONITORING_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // We intentionally swallow reporting failures.
  });
}
