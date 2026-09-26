"use client";
import Link from "next/link";
import { useStaffSession } from "@/modules/auth";
import { usePropertyScope } from "@/modules/properties";
import { usePortfolio } from "../hooks/use-portfolio";
import { consolidateMetrics } from "../model/portfolio";
import { PortfolioState, ScopeSummary, formatAmount } from "./portfolio-state";
import type { ViewProps } from "../types";
import styles from "./multi-property.module.css";

export function MultiPropertyDashboard({ onNavigate }: Partial<ViewProps>) {
  const session = useStaffSession();
  const context = usePropertyScope();
  const query = usePortfolio();
  const rows = query.data ?? [];
  const totals = consolidateMetrics(rows);
  return <section className={styles.page}>
    <header className={styles.header}>
      <div><h1 className={styles.title}>Dashboard Multi-property</h1><p className={styles.subtitle}>Métricas por propiedad · snapshot de demostración del 08 sep 2026</p></div>
      {session.permissions.includes("COMPARE_AVAILABILITY") && (onNavigate
        ? <button className={styles.btnOlive} onClick={() => onNavigate("search")}>Comparar disponibilidad</button>
        : <Link className={styles.btnOlive} href="/multi-property/disponibilidad/buscar">Comparar disponibilidad</Link>)}
    </header>
    <ScopeSummary />
    <PortfolioState context={context} query={query} empty={rows.length === 0} />
    {context.scope && !query.isPending && !query.isError && rows.length > 0 && <>
      {totals.map(total => <section key={total.currency + total.date} aria-label={"Consolidado " + total.currency}>
        <h2 className={styles.cardTitle}>Consolidado · {total.currency} · {total.date}</h2>
        <div className={styles.grid4}>
          {[
            ["Ocupación portfolio", total.occupancy === null ? "Sin base disponible" : total.occupancy.toFixed(1) + "%", total.roomsSold + " / " + total.roomsAvailable + " room-nights"],
            ["ADR portfolio", formatAmount(total.adr, total.currency), "Revenue / room-nights vendidos"],
            ["RevPAR portfolio", formatAmount(total.revpar, total.currency), "Revenue / room-nights disponibles"],
            ["Revenue neto", formatAmount(total.revenue, total.currency), "Snapshot de demostración"],
          ].map(([title, value, footer]) => <div className={styles.cardNoMargin} key={title}><h3 className={styles.cardTitle}>{title}</h3><p className={styles.cardValueBig}>{value}</p><p className={styles.cardFooter}>{footer}</p></div>)}
        </div>
      </section>)}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Propiedades autorizadas · comparación</h2>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Métricas por propiedad">
          <table className={styles.table}>
            <thead><tr>{["Propiedad", "Ocupación", "ADR", "RevPAR", "Revenue neto", "Zona horaria"].map(label => <th className={styles.th} scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{rows.map(row => {
              const property = session.memberships.find(item => item.propertyId === row.propertyId);
              return <tr key={row.propertyId}><th scope="row" className={styles.td}>{row.propertyId} · {property?.name}</th><td className={styles.td}>{row.occupancy === null ? "—" : row.occupancy.toFixed(1) + "%"}</td><td className={styles.td}>{formatAmount(row.adr, row.currency)}</td><td className={styles.td}>{formatAmount(row.revpar, row.currency)}</td><td className={styles.td}>{formatAmount(row.revenue, row.currency)}</td><td className={styles.td}>{property?.timezone}</td></tr>;
            })}</tbody>
          </table>
        </div>
        {rows.length < context.scope.propertyIds.length && <p role="status">Algunas propiedades seleccionadas no tienen métricas en este snapshot. El consolidado incluye únicamente las filas disponibles.</p>}
      </div>
    </>}
  </section>;
}
