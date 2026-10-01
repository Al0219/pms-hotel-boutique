export interface Env {
  WEBHOOK_SECRET: string;
  NOTIFICATION_HUB: DurableObjectNamespace;
}

export interface NotificationPayload {
  id?: string;
  type: string;
  title: string;
  message: string;
  reservationId?: string | null;
  propertyId?: string | null;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cloudflare Durable Object managing persistent WebSocket connections and broadcasts.
 */
export class NotificationHub implements DurableObject {
  private state: DurableObjectState;
  private sockets: Set<WebSocket>;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    this.sockets = new Set<WebSocket>();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade endpoint
    if (url.pathname === "/ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [clientSocket, serverSocket] = Object.values(pair);

      serverSocket.accept();
      this.sockets.add(serverSocket);

      // Welcome message
      serverSocket.send(
        JSON.stringify({
          type: "SYSTEM",
          title: "Conexión Establecida",
          message: "Conectado exitosamente al hub de notificaciones de PMS Hotel Boutique.",
          timestamp: new Date().toISOString(),
        })
      );

      // Handle incoming messages from clients (e.g. heartbeat ping)
      serverSocket.addEventListener("message", (event) => {
        try {
          const data = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
          if (data === "ping" || data === '{"type":"PING"}') {
            serverSocket.send(JSON.stringify({ type: "PONG", timestamp: new Date().toISOString() }));
          }
        } catch (err) {
          // Ignore invalid client frame
        }
      });

      // Cleanup on close or error
      const removeSocket = () => {
        this.sockets.delete(serverSocket);
      };

      serverSocket.addEventListener("close", removeSocket);
      serverSocket.addEventListener("error", removeSocket);

      return new Response(null, {
        status: 101,
        webSocket: clientSocket,
      });
    }

    // Internal broadcast route called by Worker endpoint
    if (url.pathname === "/broadcast" && request.method === "POST") {
      const notification = await request.json();
      const payloadString = JSON.stringify(notification);

      let notifiedCount = 0;
      const deadSockets: WebSocket[] = [];

      for (const socket of this.sockets) {
        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(payloadString);
            notifiedCount++;
          } else {
            deadSockets.push(socket);
          }
        } catch {
          deadSockets.push(socket);
        }
      }

      // Cleanup closed sockets
      for (const dead of deadSockets) {
        this.sockets.delete(dead);
      }

      return new Response(
        JSON.stringify({
          success: true,
          clientsNotified: notifiedCount,
          activeSockets: this.sockets.size,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Not found in NotificationHub" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. WebSocket Upgrade Endpoint (/ws)
    if (url.pathname === "/ws") {
      const id = env.NOTIFICATION_HUB.idFromName("global_notification_hub");
      const stub = env.NOTIFICATION_HUB.get(id);
      return stub.fetch(request);
    }

    // 2. Webhook Gateway Endpoint (POST /api/webhook)
    if (url.pathname === "/api/webhook") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Security check: Bearer secret token matching WEBHOOK_SECRET env var
      const authHeader = request.headers.get("Authorization");
      const expectedSecret = env.WEBHOOK_SECRET || "pms_secret_webhook_key_2026";
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Missing Bearer authorization token." }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const token = authHeader.substring(7).trim();
      if (token !== expectedSecret) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid Webhook Secret." }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      let body: NotificationPayload;
      try {
        body = (await request.json()) as NotificationPayload;
      } catch {
        return new Response(
          JSON.stringify({ error: "Bad Request: Invalid JSON payload body." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!body.type || !body.title || !body.message) {
        return new Response(
          JSON.stringify({
            error: "Bad Request: Fields 'type', 'title', and 'message' are required.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Normalize notification model
      const formattedNotification = {
        id: body.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type: body.type.toUpperCase(),
        title: body.title,
        message: body.message,
        reservationId: body.reservationId || null,
        propertyId: body.propertyId || null,
        timestamp: body.timestamp || new Date().toISOString(),
        metadata: body.metadata || {},
      };

      // Broadcast through Durable Object Hub
      const id = env.NOTIFICATION_HUB.idFromName("global_notification_hub");
      const stub = env.NOTIFICATION_HUB.get(id);

      const broadcastRequest = new Request("https://internal/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedNotification),
      });

      return stub.fetch(broadcastRequest);
    }

    // Health check and root info
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          service: "PMS Hotel Boutique - Cloudflare Notification Gateway",
          status: "UP",
          websocketEndpoint: "/ws",
          webhookEndpoint: "/api/webhook",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
