"use client";

import React from "react";
import styles from "./multi-property.module.css";
import { ViewProps } from "../types";

export function AvailabilityResults({ onNavigate }: ViewProps) {
  const HEADER = {
    title: "Disponibilidad cross-property",
    subtitle: "12–14 sep 2026 · 2 noches · scope ALL_PROPERTIES {GT-HB-01, GT-HB-03}",
  };

  const SUMMARY_GRID = [
    { label: "Propiedades", val: "2 autorizadas" },
    { label: "Noches", val: "2 · 12/13 sep" },
    { label: "Opciones", val: "4 RoomTypes" },
    { label: "Mejor stay ATS", val: "4 · GT-HB-03" },
  ];

  const TABLE_DATA = [
    {
      roomType: "GT-HB-01 · Deluxe King",
      ats12: 2,
      ats13: 3,
      stayAts: 2,
      bar: "Q 1,150",
      status: "AVAILABLE",
      statusType: "AVAILABLE",
    },
    {
      roomType: "GT-HB-01 · Standard Twin",
      ats12: 1,
      ats13: 1,
      stayAts: 1,
      bar: "Q 900",
      status: "LIMITED",
      statusType: "LIMITED",
    },
    {
      roomType: "GT-HB-03 · Patio King",
      ats12: 5,
      ats13: 4,
      stayAts: 4,
      bar: "Q 1,340",
      status: "AVAILABLE",
      statusType: "AVAILABLE",
    },
    {
      roomType: "GT-HB-03 · Colonial Suite",
      ats12: 2,
      ats13: 2,
      stayAts: 2,
      bar: "Q 1,650",
      status: "AVAILABLE",
      statusType: "AVAILABLE",
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{HEADER.title}</h1>
          <p className={styles.subtitle}>{HEADER.subtitle}</p>
        </div>
      </header>

      {/* Resumen */}
      <div className={styles.grid4}>
        {SUMMARY_GRID.map((item, idx) => (
          <div key={idx} className={styles.cardNoMargin}>
            <p className={styles.textGray} style={{ fontSize: '0.875rem' }}>{item.label}</p>
            <p className={styles.textBold} style={{ marginTop: '0.25rem' }}>{item.val}</p>
          </div>
        ))}
      </div>

      {/* Tabla Principal */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Comparación por propiedad y fecha</h2>
        <p className={styles.cardTitleSmall} style={{ marginBottom: '1rem', fontWeight: 'normal' }}>
          Stay ATS = mínimo de ATS diario entre las noches solicitadas. Source: AvailabilityPort por property_id.
        </p>

        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>PROPERTY / ROOM TYPE</th>
              <th className={styles.th}>12 SEP ATS</th>
              <th className={styles.th}>13 SEP ATS</th>
              <th className={styles.th}>STAY ATS</th>
              <th className={styles.th}>BAR / NIGHT</th>
              <th className={styles.th}>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_DATA.map((row, idx) => (
              <tr key={idx}>
                <td className={styles.td}>{row.roomType}</td>
                <td className={styles.td}>{row.ats12}</td>
                <td className={styles.td}>{row.ats13}</td>
                <td className={styles.td}>{row.stayAts}</td>
                <td className={styles.td}>{row.bar}</td>
                <td className={styles.td}>
                  <span className={row.statusType === 'AVAILABLE' ? styles.textBold : `${styles.textBold} ${styles.textGray}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <p className={styles.cardFooter} style={{ marginTop: '1rem' }}>
          Comparación informativa: no crea reserva, no mueve estancia y no modifica inventario. Rebooking requiere confirmación separada.
        </p>
      </div>

      {/* Resultado */}
      <div className={styles.card}>
        <h3 className={styles.cardTitleSmall}>Resultado</h3>
        <p className={styles.textBold} style={{ fontSize: '1.25rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          GT-HB-03 ofrece mayor disponibilidad para estas fechas: Patio King stay ATS 4 vs Deluxe King GT-HB-01 stay ATS 2.
        </p>
        <p className={styles.cardFooter}>
          Scope preservado · role Gerencia · 0 propiedades fuera del set autorizado.
        </p>
      </div>

      {/* Acciones */}
      <div className={styles.footerActions}>
        <button className={styles.btnOutline} onClick={() => onNavigate('search')}>&lt;- Cambiar fechas</button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={styles.btnOutline} onClick={() => onNavigate('dashboard')}>Dashboard Multi-property</button>
          <button className={styles.btnOlive} onClick={() => onNavigate('evaluate')}>Evaluar rebooking</button>
        </div>
      </div>
    </div>
  );
}
