"use client";

import { useReportWebVitals } from "next/web-vitals";
import Script from "next/script";
import { sentryCaptureClientMessage } from "../lib/sentry-client";

type GoogleAnalyticsProps = {
  trackingId: string;
};

export function GoogleAnalytics({ trackingId }: GoogleAnalyticsProps) {
  useReportWebVitals((metric) => {
    const value = metric.name === "CLS" ? metric.value * 1000 : metric.value;

    if (metric.rating === "poor") {
      void sentryCaptureClientMessage(`Poor web vital: ${metric.name}`, {
        level: "warning",
        tags: {
          source: "frontend",
          type: "web_vital",
        },
        extra: {
          metric: metric.name,
          id: metric.id,
          value: Math.round(value),
          rating: metric.rating,
          navigationType: metric.navigationType,
        },
      });
    }

    const gtag = (window as any).gtag as ((...args: any[]) => void) | undefined;
    if (!gtag) return;

    gtag("event", metric.name, {
      event_category: "Web Vitals",
      event_label: metric.id,
      value: Math.round(value),
      non_interaction: true,
    });
  });

  if (!trackingId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${trackingId}`}
        strategy="lazyOnload"
      />
      <Script id="ga-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${trackingId}', { page_path: window.location.pathname });`}
      </Script>
    </>
  );
}

