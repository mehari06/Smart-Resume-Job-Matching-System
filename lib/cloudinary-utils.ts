/**
 * Utility to get a trusted Unix timestamp (in seconds) to avoid 'Stale Request'
 * errors when interacting with Cloudinary from environments with clock drift.
 */
export async function getTrustedUnixTimestampSeconds(): Promise<number> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        
        // Use Cloudflare trace to get a highly reliable UTC timestamp
        const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timeout);

        const text = await res.text();
        const match = text.match(/ts=([\d.]+)/);
        if (match) {
            return Math.floor(parseFloat(match[1]));
        }
    } catch (e) {
        console.warn("[getTrustedUnixTimestampSeconds] Cloudflare trace failed, fallback to local clock. Error:", e);
    }

    return Math.floor(Date.now() / 1000);
}
