"use client";

import React from "react";
import styles from "./multi-property.module.css";

export function MultiPropertyDashboard() {
  const HEADER = {
    title: "Dashboard Multi-property",
    subtitle: "Portfolio autorizado · snapshot 08 sep 2026 · métricas consolidadas por propiedad",
  };

  const KPIS = [
    {
      title: "Ocupación portfolio",
      value: "79%",
      badge: "2 props",
      footer: "158 / 200 room-nights",
    },
    {
      title: "ADR portfolio",
      value: "Q 1,228",
      badge: "NET",
      footer: "Q194,050 / 158 sold RN",
    },
    {
      title: "RevPAR portfolio",
      value: "Q 970",
      badge: "NET",
      footer: "Q194,050 / 200 avail. RN",
    },
    {
      title: "Revenue neto",
      value: "Q 194,050",
      badge: "2 props",
      footer: "room revenue net · GTQ",
    },
  ];

  const PROPERTIES = [
    {
      name: "GT-HB-01 · Hotel Boutique Huehue",
      occ: "82%",
      adr: "Q 1,125",
      revpar: "Q 923",
      revenue: "Q 92,250",
      alerts: "2",
    },
    {
      name: "GT-HB-03 · Hotel Boutique Antigua",
      occ: "76%",
      adr: "Q 1,340",
      revpar: "Q 1,018",
      revenue: "Q 101,800",
      alerts: "1",
    },
  ];

  const ALERTS = [
    {
      prop: "GT-HB-01 · Hotel Boutique Huehue",
      message: "Parity gap +6% · OOO 1",
      count: "2 alertas",
    },
    {
      prop: "GT-HB-03 · Hotel Boutique Antigua",
      message: "Locks DEGRADED · 1 device offline",
      count: "1 alerta",
    },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{HEADER.title}</h1>
          <p className={styles.subtitle}>{HEADER.subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnGray}>Gerencia</button>
          <span className={styles.btnPillOutline}>Portfolio · 2 propiedades</span>
          <button className={styles.btnOlive}>Cambiar a GT-HB-03</button>
          <button className={styles.btnOlive}>Comparar disponibilidad</button>
        </div>
      </header>

      {/* KPIs */}
      <div className={styles.grid4}>
        {KPIS.map((kpi, idx) => (
          <div key={idx} className={styles.cardNoMargin}>
            <h3 className={styles.cardTitle}>{kpi.title}</h3>
            <div className={styles.flexStart} style={{ gap: '0.5rem', alignItems: 'baseline' }}>
              <p className={styles.cardValueBig}>{kpi.value}</p>
              <span className={styles.badgeGreen}>{kpi.badge}</span>
            </div>
            <p className={styles.cardFooter}>{kpi.footer}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Propiedades autorizadas · comparación</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Propiedad</th>
              <th className={styles.th}>Ocup.</th>
              <th className={styles.th}>ADR</th>
              <th className={styles.th}>RevPAR</th>
              <th className={styles.th}>Revenue neto</th>
              <th className={styles.th}>Alertas</th>
            </tr>
          </thead>
          <tbody>
            {PROPERTIES.map((prop, idx) => (
              <tr key={idx}>
                <td className={`${styles.td} ${styles.tdBold}`}>{prop.name}</td>
                <td className={styles.td}>{prop.occ}</td>
                <td className={styles.td}>{prop.adr}</td>
                <td className={styles.td}>{prop.revpar}</td>
                <td className={styles.td}>{prop.revenue}</td>
                <td className={styles.td}>{prop.alerts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer Text */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className={styles.textBold} style={{ fontSize: '0.875rem' }}>
          Portfolio: 158/200 room-nights = 79% · ADR Q1,228 · RevPAR Q970 · Revenue Q194,050 · 3 alertas
        </p>
        <p className={styles.textGray} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
          Solo propiedades del portfolio autorizado; métricas por propiedad antes del agregado.
        </p>
      </div>

      {/* Alerts Card */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Alertas por propiedad</h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ALERTS.map((alert, idx) => (
            <div key={idx} className={styles.listRow}>
              <span className={styles.textBold} style={{ flex: 1 }}>{alert.prop}</span>
              <span className={styles.textGray} style={{ flex: 1, textAlign: 'center' }}>{alert.message}</span>
              <span className={styles.textBold} style={{ flex: 1, textAlign: 'right' }}>{alert.count}</span>
            </div>
          ))}
        </div>
        <p className={styles.cardFooter} style={{ marginTop: '1rem' }}>
          3 alertas portfolio · cada alerta conserva property_id y origen.
        </p>
      </div>
    </div>
  );
}
