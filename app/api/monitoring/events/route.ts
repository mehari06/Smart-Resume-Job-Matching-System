import { NextRequest, NextResponse } from "next/server";
import type { MonitoringEvent } from "../../../../lib/monitoring";
import { recordServerEvent, recordServerError } from "../../../../lib/monitoring-server";

export const dynamic = "force-dynamic";

function sanitizeMetadata(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const entries = Object.entries(input as Record<string, unknown>).slice(0, 50);
  return Object.fromEntries(entries);
}

function sanitizeEvent(input: unknown, request: NextRequest): MonitoringEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const data = input as Partial<MonitoringEvent>;
  const type = typeof data.type === "string" ? data.type.slice(0, 120) : "";
  if (!type) return null;

  const message = typeof data.message === "string" ? data.message.slice(0, 1000) : undefined;
  const level: MonitoringEvent["level"] =
    data.level === "warning" || data.level === "error" || data.level === "info"
      ? data.level
      : "info";
  const path = typeof data.path === "string" ? data.path.slice(0, 500) : request.nextUrl.pathname;
  const source =
    data.source === "frontend" || data.source === "backend" || data.source === "next-api"
      ? data.source
      : "frontend";

  return {
    source,
    type,
    level,
    message,
    path,
    timestamp: typeof data.timestamp === "string" ? data.timestamp : undefined,
    metadata: {
      ...sanitizeMetadata(data.metadata),
      ip:
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        "unknown",
      requestId: request.headers.get("x-request-id") ?? undefined,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as unknown;
    const event = sanitizeEvent(payload, request);

    if (!event) {
      return NextResponse.json({ error: "Invalid monitoring payload" }, { status: 400 });
    }

    await recordServerEvent(event);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    await recordServerError({
      type: "next.monitoring_ingest_failed",
      message: "Failed to ingest monitoring event",
      path: request.nextUrl.pathname,
      error,
    });
    return NextResponse.json({ error: "Failed to ingest event" }, { status: 500 });
  }
}
