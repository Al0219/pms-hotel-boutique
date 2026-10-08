import type { ValetRequest, ValetRequestRequestType, ValetRequestStatus } from "../model/valet-request";

import styles from "./parking-valet-center.module.css";

interface ParkingValetDetailProps {
  request: ValetRequest;
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

function Reference({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return <div className={styles.reference}><dt>{label}</dt><dd>{value ?? "Sin asignar"}</dd></div>;
}

export function ParkingValetDetail({ request }: Readonly<ParkingValetDetailProps>) {
  return <section className={styles.detail} aria-labelledby="valet-detail-title">
    <p className={styles.eyebrow}>Valet Request</p>
    <h2 id="valet-detail-title">{request.guestName}</h2>
    <div className={styles.summaryGrid}>
      <Reference label="Solicitud" value={request.id} />
      <Reference label="Estado" value={STATUS_LABELS[request.status]} />
      <Reference label="Tipo" value={REQUEST_TYPE_LABELS[request.requestType]} />
    </div>
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="valet-vehicle-title">
        <h3 id="valet-vehicle-title">Vehículo</h3>
        <dl className={styles.references}>
          <Reference label="Descripción" value={request.vehicleDescription} />
          <Reference label="Espacio de estacionamiento" value={request.parkingSpace} />
        </dl>
      </section>
      <section className={styles.detailCard} aria-labelledby="valet-notes-title">
        <h3 id="valet-notes-title">Notas operativas</h3>
        <dl className={styles.references}>
          <Reference label="Property ID" value={request.propertyId} />
          <Reference label="Notas" value={request.notes} />
        </dl>
        <p className={styles.note}>
          Cola interna: Parking/Valet gestiona la solicitud y coordina con Recepción. No envía mensajes directos al huésped.
        </p>
      </section>
    </div>
  </section>;
}
