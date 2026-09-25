"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";

import { useMaintenanceOrders } from "../hooks/use-maintenance-orders";
import { MaintenanceDetail } from "./maintenance-detail";
import styles from "./maintenance-center.module.css";

interface MaintenanceCenterProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Maintenance contract. */
  endpoint?: string;
  /** Supplied by composition once Backend confirms the resolution contract. */
  onResolve?: (orderId: string) => void;
}

export function MaintenanceCenter({ propertyId, endpoint, onResolve }: Readonly<MaintenanceCenterProps>) {
  const { data: orders, error, isLoading, refetch } = useMaintenanceOrders(propertyId, endpoint);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Mantenimiento</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar órdenes.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Mantenimiento</h1><p>La consulta de órdenes de mantenimiento estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando órdenes de mantenimiento…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudieron consultar las órdenes de mantenimiento."
      : "No se pudieron cargar las órdenes de mantenimiento.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!orders?.length) {
    return <main className={styles.page}><h1>Mantenimiento</h1><p>No hay órdenes de mantenimiento para esta propiedad.</p></main>;
  }

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Operations</p>
      <h1>Mantenimiento</h1>
      <p>Consulta las órdenes de mantenimiento de la propiedad {propertyId}, su impacto y su historial.</p>
    </header>
    <div className={styles.content}>
      <section className={styles.listPanel} aria-labelledby="maintenance-list-title">
        <div className={styles.panelHeader}>
          <div><p className={styles.eyebrow}>Órdenes</p><h2 id="maintenance-list-title" className={styles.sectionTitle}>Órdenes de trabajo</h2></div>
          <span className={styles.count}>{orders.length} registradas</span>
        </div>
        <ul className={styles.list}>
          {orders.map((order) => <li key={order.id}>
            <button
              className={styles.orderButton}
              type="button"
              aria-pressed={order.id === selectedOrder.id}
              onClick={() => setSelectedOrderId(order.id)}
            >
              <span><strong>{order.title}</strong><small>{order.id} · Hab. {order.roomId}</small></span>
              <span className={styles.status}>{order.status}</span>
            </button>
          </li>)}
        </ul>
      </section>
      <MaintenanceDetail order={selectedOrder} onResolve={onResolve} />
    </div>
  </main>;
}
