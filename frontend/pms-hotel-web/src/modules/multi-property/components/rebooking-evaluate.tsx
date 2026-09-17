"use client";

import React from "react";
import styles from "./multi-property.module.css";
import { ViewProps } from "../types";

export function RebookingEvaluate({ onNavigate }: ViewProps) {
  const HEADER = {
    title: "Rebooking cross-property · Evaluar",
    subtitle: "Escenario RBK-08421-01 · no aplicar hasta confirmar tarifa, política y disponibilidad destino.",
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{HEADER.title}</h1>
          <p className={styles.subtitle}>{HEADER.subtitle}</p>
        </div>
      </header>

      {/* Tarjeta Top */}
      <div className={styles.card}>
        <div className={styles.flexBetween}>
          <div>
            <p className={styles.textBold}>Reservation HB-2026-08421 · María López · stay 12–14 sep 2026 · role Gerencia</p>
            <p className={styles.textGray} style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Scope ALL_PROPERTIES {`{GT-HB-01, GT-HB-03}`} · source y destination autorizadas.
            </p>
          </div>
          <div className={styles.textRight}>
            <p className={styles.textBold}>Estado PREVIEW</p>
            <p className={styles.textBold} style={{ fontSize: '0.875rem' }}>source aún UNCHANGED</p>
          </div>
        </div>
      </div>

      {/* Grid 2 Tarjetas (Origen vs Destino) */}
      <div className={styles.grid2}>
        {/* Origen */}
        <div className={styles.cardNoMargin}>
          <h2 className={styles.cardValueMedium} style={{ margin: '0 0 1rem 0' }}>Origen · GT-HB-01</h2>
          <p className={styles.textBold}>Deluxe King · BAR Flexible</p>
          <p className={styles.paragraph} style={{ marginTop: '0.25rem' }}>Q 1,150 / noche x 2 = Q 2,300</p>
          <div style={{ marginTop: '1.5rem' }}>
            <p className={styles.cardFooter}>Reservation HB-2026-08421 · source stay permanece activo</p>
            <p className={styles.cardFooterBold}>No cancelado · no transferido</p>
          </div>
        </div>

        {/* Destino */}
        <div className={styles.cardNoMargin}>
          <h2 className={styles.cardValueMedium} style={{ margin: '0 0 1rem 0' }}>Destino · GT-HB-03</h2>
          <p className={styles.textBold}>Patio King · BAR Flexible</p>
          <p className={styles.paragraph} style={{ marginTop: '0.25rem' }}>Q 1,340 / noche x 2 = Q 2,680</p>
          <div style={{ marginTop: '1.5rem' }}>
            <p className={styles.cardFooter}>AvailabilityPort revalidará antes del commit</p>
            <p className={styles.cardFooterBold}>Stay ATS actual = 4</p>
          </div>
        </div>
      </div>

      {/* Confirmaciones obligatorias */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Confirmaciones obligatorias</h2>
        
        <div className={styles.listRow}>
          <span className={styles.textGray} style={{ flex: '0 0 120px' }}>1 · TARIFA</span>
          <span className={styles.textBold} style={{ flex: 1, textAlign: 'center' }}>Q2,300 -&gt; Q2,680 · diferencia +Q380 GTQ</span>
          <span className={styles.textBold} style={{ flex: '0 0 120px', textAlign: 'right' }}>CONFIRMADA</span>
        </div>
        
        <div className={styles.listRow}>
          <span className={styles.textGray} style={{ flex: '0 0 120px' }}>2 · POLÍTICA</span>
          <span className={styles.textBold} style={{ flex: 1, textAlign: 'center' }}>BAR Flexible origen/destino · rebooking permitido · garantía destino aceptada</span>
          <span className={styles.textBold} style={{ flex: '0 0 120px', textAlign: 'right' }}>CONFIRMADA</span>
        </div>

        <div className={styles.listRow}>
          <span className={styles.textGray} style={{ flex: '0 0 120px' }}>3 · DISPONIBILIDAD</span>
          <span className={styles.textBold} style={{ flex: 1, textAlign: 'center' }}>GT-HB-03 Patio King · ATS 12 sep=5 / 13 sep=4 · stay ATS=4</span>
          <span className={styles.textBold} style={{ flex: '0 0 120px', textAlign: 'right' }}>REVALIDADA</span>
        </div>

        <p className={styles.cardFooter} style={{ marginTop: '1rem' }}>
          APPLY permitido solo si rate_confirmed && policy_confirmed && destination_availability_revalidated.
        </p>
      </div>

      {/* READY_TO_CONFIRM */}
      <div className={styles.pillWide}>
        <span className={styles.textBold}>READY_TO_CONFIRM</span>
        <span className={styles.textGray} style={{ fontSize: '0.875rem' }}>Las 3 condiciones están confirmadas; el source sigue intacto hasta la acción final.</span>
      </div>

      {/* Acciones */}
      <div className={styles.footerActions}>
        <button className={styles.btnOutline} onClick={() => onNavigate('results')}>&lt;- Resultados disponibilidad</button>
        <button className={styles.btnOlive} onClick={() => onNavigate('applied')}>Confirmar rebooking</button>
      </div>
    </div>
  );
}
