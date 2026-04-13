// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "../../../lib/api-auth";
import { jobEventBus } from "../../../lib/event-bus";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events (SSE) Endpoint
 * Acts as an Observer for the Recruiter by subscribing them to the JobEventBus.
 * When a "new_application" event is notified, it's pushed to the recruiter's browser.
 */
export async function GET(request: NextRequest) {
    const auth = await requireSessionUser();
    if ("error" in auth) {
        return auth.error;
    }
    const user = auth.user;

    // Use a ReadableStream for SSE
    const responseStream = new ReadableStream({
        start(controller) {
            // Define how to send data
            const sendEvent = (data: any) => {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(new TextEncoder().encode(message));
            };

            // Keep-alive interval (every 30 seconds)
            const keepAlive = setInterval(() => {
                controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"));
            }, 30000);

            // Subscribe to the EventBus
            const unsubscribe = jobEventBus.subscribe(user.id, (data) => {
                sendEvent(data);
            });

            // Cleanup when the stream is closed
            request.signal.addEventListener("abort", () => {
                clearInterval(keepAlive);
                unsubscribe();
                controller.close();
            });

            // Initial success event
            sendEvent({ type: "connection_established", userId: user.id });
        },
    });

    return new Response(responseStream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        },
    });
}
