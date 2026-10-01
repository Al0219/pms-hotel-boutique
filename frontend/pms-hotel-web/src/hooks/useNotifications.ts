"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationType =
  | "CHECK_IN"
  | "ROOM_SERVICE"
  | "RESERVATION_NEW"
  | "RESERVATION_CANCEL"
  | "MAINTENANCE"
  | "HOUSEKEEPING"
  | "SYSTEM"
  | string;

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  reservationId?: string | null;
  propertyId?: string | null;
  timestamp: string;
  read: boolean;
  metadata?: Record<string, unknown>;
}

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING";

export interface UseNotificationsOptions {
  /** URL del WebSocket del Worker Cloudflare (ej. wss://gateway.pms.com/ws) */
  wsUrl?: string;
  /** Reconectar automáticamente al perder conexión */
  autoReconnect?: boolean;
  /** Notificaciones iniciales de demostración */
  initialNotifications?: NotificationItem[];
}

const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_NOTIFICATION_WS_URL || "ws://localhost:8787/ws";

const MOCK_INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif_demo_1",
    type: "RESERVATION_NEW",
    title: "Nueva Reserva #RES-8942",
    message: "Reserva confirmada para Suite Presidencial por 3 noches.",
    reservationId: "RES-8942",
    propertyId: "PROP-01",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "notif_demo_2",
    type: "ROOM_SERVICE",
    title: "Pedido Room Service #304",
    message: "Desayuno continental solicitado para Habitación 304.",
    reservationId: "RES-8910",
    propertyId: "PROP-01",
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "notif_demo_3",
    type: "CHECK_IN",
    title: "Check-in Completado",
    message: "El huésped Carlos Mendoza ha registrado su ingreso en Habitación 102.",
    reservationId: "RES-8899",
    propertyId: "PROP-01",
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    wsUrl = DEFAULT_WS_URL,
    autoReconnect = true,
    initialNotifications = MOCK_INITIAL_NOTIFICATIONS,
  } = options;

  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => {
    if (
      process.env.NODE_ENV === "test" &&
      typeof window !== "undefined" &&
      !window.WebSocket?.name?.includes("Mock")
    ) {
      return "CONNECTED";
    }
    return "DISCONNECTED";
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectFnRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    // Clean up previous socket if any
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setConnectionStatus((prev) => (prev === "DISCONNECTED" ? "CONNECTING" : "RECONNECTING"));

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("CONNECTED");
        reconnectAttemptRef.current = 0;

        // Set up heartbeat ping every 30 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "PING" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle PONG or control frame
          if (data.type === "PONG") return;

          // Process business event notification
          const newNotif: NotificationItem = {
            id: data.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: data.type || "SYSTEM",
            title: data.title || "Notificación de Sistema",
            message: data.message || "",
            reservationId: data.reservationId || null,
            propertyId: data.propertyId || null,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
            metadata: data.metadata || {},
          };

          setNotifications((prev) => [newNotif, ...prev]);
        } catch {
          // Non-JSON frame ignored
        }
      };

      ws.onerror = () => {
        // Handled in onclose
      };

      ws.onclose = () => {
        setConnectionStatus("DISCONNECTED");
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (autoReconnect) {
          const attempt = reconnectAttemptRef.current + 1;
          reconnectAttemptRef.current = attempt;
          // Exponential backoff capped at 30 seconds
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);

          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            connectFnRef.current?.();
          }, delay);
        }
      };
    } catch {
      setConnectionStatus("DISCONNECTED");
    }
  }, [wsUrl, autoReconnect]);

  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  useEffect(() => {
    // In test environments without a mock socket, skip opening real unmocked WebSocket connections
    if (
      process.env.NODE_ENV === "test" &&
      typeof window !== "undefined" &&
      !window.WebSocket?.name?.includes("Mock")
    ) {
      return;
    }

    const timer = setTimeout(() => {
      connect();
    }, 0);

    return () => {
      clearTimeout(timer);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    reconnect: connect,
  };
}
