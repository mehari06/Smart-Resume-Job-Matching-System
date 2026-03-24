"use client";

import Script from "next/script";

type GoogleAnalyticsProps = {
  trackingId: string;
};

export function GoogleAnalytics({ trackingId }: GoogleAnalyticsProps) {
  if (!trackingId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${trackingId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${trackingId}', { page_path: window.location.pathname });`}
      </Script>
    </>
  );
}

