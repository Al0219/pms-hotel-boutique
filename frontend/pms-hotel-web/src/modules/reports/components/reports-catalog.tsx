"use client";

import { useState } from "react";

import type { PropertyScope } from "@/modules/properties";

import { DailyOnBooksDashboard } from "./daily-on-books-dashboard";
import styles from "./reports-dashboard.module.css";

interface Props {
  sessionId: string;
  scope: PropertyScope;
  propertyNames: Record<string, string>;
}

const pendingCategories = [
  { name: "Finanzas", description: "Ingresos, caja, folios, pagos e impuestos" },
  { name: "Cumplimiento", description: "INGUAT, FEL/SAT, DIACO y auditoría" },
  { name: "Comercial", description: "Canales, ADR, RevPAR, pickup y CRM" },
] as const;

export function ReportsCatalog({ sessionId, scope, propertyNames }: Readonly<Props>) {
  const [selected, setSelected] = useState(false);
  if (selected) {
    return <DailyOnBooksDashboard sessionId={sessionId} scope={scope} propertyNames={propertyNames}
      onBack={() => setSelected(false)} />;
  }

  return <section className={styles.page} aria-labelledby="reports-title">
    <header className={styles.header}>
      <h1 id="reports-title">Reportes y Analytics</h1>
      <p>Operación, finanzas, cumplimiento y gerencia</p>
    </header>

    <div className={styles.kpiGrid} aria-label="Estado del catálogo">
      <div className={styles.kpiCard}><p className={styles.kpiLabel}>Reportes disponibles</p><p className={styles.kpiValue}>1</p><p className={styles.kpiHint}>On-books diario conectado</p></div>
      <div className={styles.kpiCard}><p className={styles.kpiLabel}>Programados</p><p className={styles.kpiValue}>—</p><p className={styles.kpiHint}>Pendiente de integración</p></div>
      <div className={styles.kpiCard}><p className={styles.kpiLabel}>Exportaciones</p><p className={styles.kpiValue}>—</p><p className={styles.kpiHint}>Pendiente de contrato</p></div>
      <div className={styles.kpiCard}><p className={styles.kpiLabel}>Alertas</p><p className={styles.kpiValue}>—</p><p className={styles.kpiHint}>Pendiente de integración</p></div>
    </div>

    <button className={styles.primaryButton} type="button" onClick={() => setSelected(true)}>Abrir on-books de reservaciones</button>

    <div className={styles.categoryGrid} aria-label="Categorías de reportes">
      <section className={styles.categoryCard}>
        <h2>Operación</h2>
        <p>Reservaciones on-books por noche; ocupación realizada, llegadas/salidas, housekeeping y mantenimiento pendientes.</p>
        <button className={styles.textButton} type="button" onClick={() => setSelected(true)}>Ver reporte on-books <span aria-hidden="true">→</span></button>
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
