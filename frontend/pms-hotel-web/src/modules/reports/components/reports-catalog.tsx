"use client";

import { useState } from "react";

import type { PropertyScope } from "@/modules/properties";

import { DailyOnBooksDashboard } from "./daily-on-books-dashboard";
import { DailyArrivalsDeparturesDashboard } from "./daily-arrivals-departures-dashboard";
import { CurrentHousekeepingDashboard } from "./current-housekeeping-dashboard";
import { CurrentMaintenanceDashboard } from "./current-maintenance-dashboard";
import styles from "./reports-dashboard.module.css";

interface Props {
  sessionId: string;
  scope: PropertyScope;
  propertyNames: Record<string, string>;
  canReadReservations: boolean;
  canReadHousekeeping: boolean;
}

const pendingCategories = [
  { name: "Finanzas", description: "Ingresos, caja, folios, pagos e impuestos" },
  { name: "Cumplimiento", description: "INGUAT, FEL/SAT, DIACO y auditoría" },
  { name: "Comercial", description: "Canales, ADR, RevPAR, pickup y CRM" },
] as const;

export function ReportsCatalog({ sessionId, scope, propertyNames, canReadReservations, canReadHousekeeping }: Readonly<Props>) {
  const [selected, setSelected] = useState<"on-books" | "arrivals-departures" | "housekeeping" | "maintenance" | null>(null);
  if (selected === "maintenance" && canReadHousekeeping) {
    return <CurrentMaintenanceDashboard sessionId={sessionId} scope={scope} propertyNames={propertyNames}
      onBack={() => setSelected(null)} />;
  }
  if (selected === "housekeeping" && canReadHousekeeping) {
    return <CurrentHousekeepingDashboard sessionId={sessionId} scope={scope} propertyNames={propertyNames}
      onBack={() => setSelected(null)} />;
  }
  if (selected === "arrivals-departures" && canReadReservations) {
    return <DailyArrivalsDeparturesDashboard sessionId={sessionId} scope={scope} propertyNames={propertyNames}
      onBack={() => setSelected(null)} />;
  }
  if (selected === "on-books" && canReadReservations) {
    return <DailyOnBooksDashboard sessionId={sessionId} scope={scope} propertyNames={propertyNames}
      onBack={() => setSelected(null)} />;
  }

  return <section className={styles.page} aria-labelledby="reports-title">
    <header className={styles.header}>
      <h1 id="reports-title">Reportes y Analytics</h1>
      <p>Operación, finanzas, cumplimiento y gerencia</p>
    </header>

    <div className={styles.kpiGrid} aria-label="Estado del catálogo">
      <div className={styles.kpiCard}><p className={styles.kpiLabel}>Reportes disponibles</p><p className={styles.kpiValue}>{(canReadReservations ? 2 : 0) + (canReadHousekeeping ? 2 : 0)}</p><p className={styles.kpiHint}>Según los permisos de tu sesión</p></div>
      <div className={styles.kpiCard}><p className={styles.kpiLabel}>Programados</p><p className={styles.kpiValue}>—</p><p className={styles.kpiHint}>Pendiente de integración</p></div>
      <div className={styles.kpiCard}><p className={styles.kpiLabel}>Exportaciones</p><p className={styles.kpiValue}>{canReadReservations ? "CSV" : "—"}</p><p className={styles.kpiHint}>{canReadReservations ? "On-books diario" : "Pendiente de integración"}</p></div>
      <div className={styles.kpiCard}><p className={styles.kpiLabel}>Alertas</p><p className={styles.kpiValue}>—</p><p className={styles.kpiHint}>Pendiente de integración</p></div>
    </div>

    {canReadReservations && <button className={styles.primaryButton} type="button" onClick={() => setSelected("on-books")}>Abrir on-books de reservaciones</button>}

    <div className={styles.categoryGrid} aria-label="Categorías de reportes">
      <section className={styles.categoryCard}>
        <h2>Operación</h2>
        <p>{canReadReservations ? "Reservaciones on-books por noche y llegadas/salidas pendientes. " : "Los reportes de reservaciones requieren permiso de reservas o comercial. "}{canReadHousekeeping ? "Housekeeping y mantenimiento actuales disponibles. " : "Housekeeping y mantenimiento requieren permiso de operaciones. "}Ocupación realizada e historial operativo pendientes de integración.</p>
        {canReadReservations && <button className={styles.textButton} type="button" onClick={() => setSelected("on-books")}>Ver reporte on-books <span aria-hidden="true">→</span></button>}
        {canReadReservations && <button className={styles.textButton} type="button" onClick={() => setSelected("arrivals-departures")}>Ver llegadas y salidas pendientes <span aria-hidden="true">→</span></button>}
        {canReadHousekeeping && <button className={styles.textButton} type="button" onClick={() => setSelected("housekeeping")}>Ver housekeeping actual <span aria-hidden="true">→</span></button>}
        {canReadHousekeeping && <button className={styles.textButton} type="button" onClick={() => setSelected("maintenance")}>Ver mantenimiento actual <span aria-hidden="true">→</span></button>}
      </section>
      {pendingCategories.map(category => <section className={styles.categoryCard} key={category.name}>
        <h2>{category.name}</h2>
        <p>{category.description}</p>
        <span className={styles.pendingBadge}>Pendiente de integración</span>
      </section>)}
    </div>

    <section className={styles.catalogPanel} aria-labelledby="saved-reports-title">
      <h2 id="saved-reports-title">Vistas guardadas</h2>
      <p>Los filtros guardados por usuario y propiedad estarán disponibles cuando se apruebe su persistencia.</p>
    </section>
    <div className={styles.secondaryGrid}>
      <section className={styles.catalogPanel}><h2>Programación de reportes</h2><p>Envíos programados pendientes de contrato y permisos.</p></section>
      <section className={styles.catalogPanel}><h2>Exportación contable</h2><p>Formato y auditoría pendientes de contrato Backend.</p></section>
    </div>
  </section>;
}

// Fin de catálogo de reportes consolidados
