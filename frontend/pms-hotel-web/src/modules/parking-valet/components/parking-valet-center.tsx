"use client";

import { useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";

import { useValetRequests } from "../hooks/use-valet-requests";
import type { ValetRequest, ValetRequestRequestType, ValetRequestStatus } from "../model/valet-request";
import { ParkingValetDetail } from "./parking-valet-detail";
import styles from "./parking-valet-center.module.css";

interface ParkingValetCenterProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Parking Valet contract. */
  endpoint?: string;
}

const STATUS_LABELS: Record<ValetRequestStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
};

const REQUEST_TYPE_LABELS: Record<ValetRequestRequestType, string> = {
  PARKING: "Estacionamiento",
  VALET_IN: "Valet entrada",
  VALET_OUT: "Valet salida",
};

const STATUS_CLASS: Record<ValetRequestStatus, string> = {
  PENDING: styles.statusWarning,
  IN_PROGRESS: styles.statusInfo,
  COMPLETED: styles.statusSuccess,
};

export function ParkingValetCenter({ propertyId, endpoint }: Readonly<ParkingValetCenterProps>) {
  const { data: requests, error, isLoading, refetch } = useValetRequests(propertyId, endpoint);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Parking / Valet</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar la cola de parking/valet.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Parking / Valet</h1><p>La cola de parking/valet estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando cola de parking/valet…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar la cola de parking/valet."
      : "No se pudo cargar la cola de parking/valet.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!requests?.length) {
    return <main className={styles.page}><h1>Parking / Valet</h1><p>No hay solicitudes de parking/valet para esta propiedad.</p></main>;
  }

  const selectedRequest = requests.find((r) => r.id === selectedRequestId) ?? requests[0];

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Operations</p>
      <h1>Parking / Valet</h1>
      <p>Cola interna de la propiedad {propertyId}: Parking/Valet gestiona cada solicitud y coordina con Recepción.</p>
    </header>
    <div className={styles.content}>
      <section className={styles.listPanel} aria-labelledby="valet-list-title">
        <div className={styles.panelHeader}>
          <div><p className={styles.eyebrow}>Solicitudes</p><h2 id="valet-list-title" className={styles.sectionTitle}>Cola interna</h2></div>
          <span className={styles.count}>{requests.length} registradas</span>
        </div>
        <ul className={styles.list}>
          {requests.map((request) => <li key={request.id}>
            <button
              className={styles.taskButton}
              type="button"
              aria-pressed={request.id === selectedRequest.id}
              onClick={() => setSelectedRequestId(request.id)}
            >
              <span><strong>{request.guestName}</strong><small>{request.vehicleDescription}</small></span>
              <span className={styles.badges}>
                <span className={styles.typeBadge}>{REQUEST_TYPE_LABELS[request.requestType]}</span>
                <span className={`${styles.statusBadge} ${STATUS_CLASS[request.status]}`}>{STATUS_LABELS[request.status]}</span>
              </span>
            </button>
          </li>)}
        </ul>
      </section>
      <ParkingValetDetail request={selectedRequest} />
    </div>
  </main>;
}
