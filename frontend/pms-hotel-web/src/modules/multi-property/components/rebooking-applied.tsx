"use client";

import React from "react";
import styles from "./multi-property.module.css";

export function RebookingApplied() {
  const HEADER = {
    title: "Rebooking cross-property · Aplicado",
    subtitle: "RBK-08421-01 · tarifa, política y disponibilidad destino confirmadas antes del commit.",
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{HEADER.title}</h1>
          <p className={styles.subtitle}>{HEADER.subtitle}</p>
        </div>
      </header>

      {/* Tarjeta Superior de Éxito */}
      <div className={styles.card}>
        <p className={styles.cardTitleSmall} style={{ color: '#6B7280' }}>REBOOKING_APPLIED</p>
        <h2 className={styles.cardValueMedium} style={{ margin: '0.75rem 0' }}>
          Destino confirmado: HB-A-2026-00412 · GT-HB-03 · Patio King · 12–14 sep 2026
        </h2>
        <p className={styles.cardFooter}>
          Source HB-2026-08421 conserva historial y queda linked_to destination; no destructive delete.
        </p>
      </div>

      {/* Fila 60/40 */}
      <div className={styles.grid6040}>
        {/* Snapshot de confirmación */}
        <div className={styles.cardNoMargin}>
          <div className={styles.listRow}>
            <span className={styles.textGray} style={{ width: '100px' }}>Tarifa</span>
            <span className={styles.textBold} style={{ flex: 1 }}>Q2,680 destino · +Q380 aceptado</span>
            <span className={styles.textBold} style={{ color: '#065F46' }}>RATE_CONFIRMED</span>
          </div>
          <div className={styles.listRow}>
            <span className={styles.textGray} style={{ width: '100px' }}>Política</span>
            <span className={styles.textBold} style={{ flex: 1 }}>BAR Flexible · policy v3 locked</span>
            <span className={styles.textBold} style={{ color: '#065F46' }}>POLICY_CONFIRMED</span>
          </div>
          <div className={styles.listRow}>
            <span className={styles.textGray} style={{ width: '100px' }}>Disponibilidad</span>
            <span className={styles.textBold} style={{ flex: 1 }}>ATS 12=5 · 13=4 · stay=4 · commit</span>
            <span className={styles.textBold} style={{ color: '#065F46' }}>REVALIDADA</span>
          </div>
          <div className={styles.listRow}>
            <span className={styles.textGray} style={{ width: '100px' }}>Scope</span>
            <span className={styles.textBold} style={{ flex: 1 }}>GT-HB-01 + GT-HB-03 autorizadas</span>
            <span className={styles.textBold} style={{ color: '#065F46' }}>SCOPE_ALLOWED</span>
          </div>
        </div>

        {/* Resultado atómico */}
        <div className={styles.cardNoMargin}>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li className={styles.textBold}>Destination reservation HB-A-2026-00412 CONFIRMED</li>
            <li className={styles.textBold}>Source history HB-2026-08421 PRESERVED</li>
            <li className={styles.textBold}>Rebooking link RBK-08421-01 CREATED</li>
          </ul>
          <p className={styles.textGray} style={{ fontSize: '0.75rem' }}>
            Si destination commit fallaba -&gt; source UNCHANGED
          </p>
        </div>
      </div>

      {/* Logs / Audit Trail */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>AuditTrail · CROSS_PROPERTY_REBOOKING_APPLIED</h2>
        
        <div className={styles.monoText}>
          actor=Gerencia · source=HB-2026-08421 · destination=HB-A-2026-00412 · rate_delta=+Q380 · policy_version=BAR-FLEX-v3
          <br />
          availability_snapshot={`{12sep:5,13sep:4,stay:4}`} · scope={`{GT-HB-01,GT-HB-03}`} · correlation=rbk_08421_01 · append-only
        </div>

        <p className={styles.cardFooterBold} style={{ marginTop: '1rem' }}>
          Aplicación solo posterior a las tres confirmaciones; no existe transición silenciosa desde PREVIEW.
        </p>
      </div>

      {/* Acciones */}
      <div className={styles.footerActions}>
        <button className={styles.btnOutline}>&lt;- Resultados disponibilidad</button>
        <button className={styles.btnOutline}>Dashboard Multi-property</button>
      </div>
    </div>
  );
}
