"use client";

import React from "react";
import styles from "./multi-property.module.css";
import { ViewProps } from "../types";

export function AvailabilitySearch({ onNavigate }: ViewProps) {
  const HEADER = {
    title: "Disponibilidad cross-property",
    subtitle: "Comparar propiedades autorizadas y noches del stay antes de reservar o trasladar.",
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{HEADER.title}</h1>
          <p className={styles.subtitle}>{HEADER.subtitle}</p>
        </div>
      </header>

      {/* Scope autorizado */}
      <div className={styles.card}>
        <div className={styles.flexBetween}>
          <div>
            <h3 className={styles.cardTitleSmall}>Scope autorizado</h3>
            <p className={styles.textBold}>ALL_PROPERTIES · {`{GT-HB-01, GT-HB-03}`}</p>
          </div>
          <div className={styles.textRight}>
            <p className={styles.textGray} style={{ fontSize: '0.75rem' }}>
              Gerencia · MULTI_PROPERTY_READ · memberships ACTIVE · scope_version 2026-09-08.1
            </p>
          </div>
        </div>
      </div>

      {/* Fila 60/40 */}
      <div className={styles.grid6040}>
        {/* Fechas del stay */}
        <div className={styles.cardNoMargin}>
          <h2 className={styles.cardTitle}>Fechas del stay</h2>
          <div className={styles.flexStart} style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
            <div className={styles.dateBlock}>
              <span className={styles.dateLabel}>Check-in</span>
              <span className={styles.dateValue}>12 sep 2026</span>
            </div>
            <span className={styles.arrow}>→</span>
            <div className={styles.dateBlock}>
              <span className={styles.dateLabel}>Check-out</span>
              <span className={styles.dateValue}>14 sep 2026</span>
            </div>
          </div>
          <p className={styles.cardFooter}>
            2 noches · compara ATS de 12 y 13 sep por propiedad/RoomType.
          </p>
        </div>

        {/* Propiedades a comparar */}
        <div className={styles.cardNoMargin}>
          <h2 className={styles.cardTitle}>Propiedades a comparar</h2>
          <div>
            <div className={styles.selectedItem}>✓ GT-HB-01 · Hotel Boutique Huehue</div>
            <div className={styles.selectedItem}>✓ GT-HB-03 · Hotel Boutique Antigua</div>
          </div>
        </div>
      </div>

      {/* Regla de búsqueda */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Regla de búsqueda</h2>
        <p className={styles.paragraph}>
          AvailabilityPort se consulta por property_id + room_type + stay_date; no se mezclan inventarios físicos entre propiedades.
        </p>
        <p className={styles.paragraph}>
          Resultados multi-property preservan property_id y ATS diario antes de calcular stay ATS.
        </p>
      </div>

      {/* Acciones */}
      <div className={styles.footerActions}>
        <button className={styles.btnOutline} onClick={() => onNavigate('dashboard')}>&lt;- Dashboard Multi-property</button>
        <button className={styles.btnOlive} onClick={() => onNavigate('results')}>Buscar disponibilidad</button>
      </div>
    </div>
  );
}
