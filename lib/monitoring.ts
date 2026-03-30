export type MonitoringLevel = "info" | "warning" | "error";

export type MonitoringEvent = {
  source: "frontend" | "next-api" | "backend";
  type: string;
  level: MonitoringLevel;
  message?: string;
  path?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

export function normalizeMonitoringEvent(input: MonitoringEvent): MonitoringEvent {
  return {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}
