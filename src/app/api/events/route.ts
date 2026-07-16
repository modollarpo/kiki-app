import { eventBus } from "@/lib/events";
import { getUserFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`));

      // Register as SSE client
      eventBus.addSSEClient(controller);

      // Send heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          eventBus.removeSSEClient(controller);
        }
      }, 15000);

      // Clean up on close
      controller.close = (() => {
        const origClose = controller.close.bind(controller);
        return () => {
          clearInterval(heartbeat);
          eventBus.removeSSEClient(controller);
          origClose();
        };
      })() as typeof controller.close;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
