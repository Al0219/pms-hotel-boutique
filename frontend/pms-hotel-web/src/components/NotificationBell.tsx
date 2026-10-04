"use client";

import { useEffect, useRef, useState } from "react";
import { NotificationItem, useNotifications } from "@/hooks/useNotifications";
import styles from "./NotificationBell.module.css";

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return "Hace un momento";
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  } catch {
    return isoString;
  }
}

function getTagClass(type: string): string {
  const t = type.toUpperCase();
  if (t.includes("RESERVATION")) return styles.typeReservation;
  if (t.includes("CHECK_IN") || t.includes("CHECK_OUT")) return styles.typeCheckIn;
  if (t.includes("ROOM_SERVICE")) return styles.typeRoomService;
  if (t.includes("MAINTENANCE") || t.includes("HOUSEKEEPING")) return styles.typeMaintenance;
  return styles.typeDefault;
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    reconnect,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const getStatusDotClass = () => {
    switch (connectionStatus) {
      case "CONNECTED":
        return `${styles.statusDot} ${styles.statusConnected}`;
      case "CONNECTING":
      case "RECONNECTING":
        return `${styles.statusDot} ${styles.statusReconnecting}`;
      default:
        return `${styles.statusDot} ${styles.statusDisconnected}`;
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case "CONNECTED":
        return "En vivo";
      case "CONNECTING":
        return "Conectando...";
      case "RECONNECTING":
        return "Reconectando...";
      default:
        return "Desconectado";
    }
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        type="button"
        className={styles.bellButton}
        onClick={toggleDropdown}
        aria-label={`Notificaciones (${unreadCount} no leídas)`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {/* SVG Bell Icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        <span className={getStatusDotClass()} title={`Estado WebSocket: ${getStatusLabel()}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="dialog" aria-label="Alertas y Notificaciones">
          <div className={styles.dropdownHeader}>
            <div className={styles.titleGroup}>
              <h3 className={styles.title}>Notificaciones</h3>
              <span className={styles.connectionPill} title={`Servidor: ${connectionStatus}`}>
                <span className={getStatusDotClass()} style={{ position: "static" }} />
                {getStatusLabel()}
              </span>
            </div>
            {unreadCount > 0 && (
              <button type="button" className={styles.markAllBtn} onClick={markAllAsRead}>
                Marcar leídas
              </button>
            )}
          </div>

          <ul className={styles.notificationList}>
            {notifications.length === 0 ? (
              <li className={styles.emptyState}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mx-auto text-gray-400"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <p>No tienes notificaciones en tiempo real.</p>
              </li>
            ) : (
              notifications.map((item: NotificationItem) => (
                <li
                  key={item.id}
                  className={`${styles.item} ${!item.read ? styles.unreadItem : ""}`}
                  onClick={() => markAsRead(item.id)}
                >
                  <div className={styles.itemHeader}>
                    <span className={`${styles.itemTypeTag} ${getTagClass(item.type)}`}>
                      {item.type.replace(/_/g, " ")}
                    </span>
                    <span className={styles.itemTime}>{formatRelativeTime(item.timestamp)}</span>
                  </div>
                  <h4 className={styles.itemTitle}>{item.title}</h4>
                  <p className={styles.itemMessage}>{item.message}</p>
                  {(item.reservationId || item.propertyId) && (
                    <div className={styles.itemFooter}>
                      {item.reservationId && (
                        <span className={styles.resIdBadge}>
                          Reserva: {item.reservationId}
                        </span>
                      )}
                      {item.propertyId && (
                        <span className={styles.resIdBadge}>
                          Prop: {item.propertyId}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>

          <div className={styles.dropdownFooter}>
            {connectionStatus === "DISCONNECTED" ? (
              <button type="button" className={styles.footerBtn} onClick={reconnect}>
                 Reorganizar conexión WebSocket
              </button>
            ) : (
              <span className="text-xs text-gray-400">Hub Serverless Activo</span>
            )}

            {notifications.length > 0 && (
              <button type="button" className={styles.footerBtn} onClick={clearNotifications}>
                Limpiar todo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
