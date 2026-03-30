const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  try {
    // eslint-disable-next-line global-require
    const Sentry = require("@sentry/nextjs");
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
      debug: false,
    });
    globalThis.__SMARTRESUME_SENTRY_INITIALIZED__ = true;
  } catch (error) {
    console.warn("[sentry] @sentry/nextjs is not installed for edge runtime");
  }
}
