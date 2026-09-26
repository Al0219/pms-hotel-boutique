"use client";
import Link from "next/link";
import { useStaffSession } from "@/modules/auth";
import { usePropertyScope } from "@/modules/properties";
import { useComparison } from "../hooks/use-portfolio";
import { stayDates, type ComparisonCriteria } from "../model/portfolio";
import { PortfolioState, ScopeSummary, formatAmount } from "./portfolio-state";
import type { ViewProps } from "../types";
import styles from "./multi-property.module.css";
export function AvailabilityResults({ criteria = null }: Partial<ViewProps> & { criteria?: ComparisonCriteria | null }) {
  const context = usePropertyScope();
  const session = useStaffSession();
  const { query, allowed } = useComparison(criteria);
  const rows = query.data ?? [];
  const dates = criteria ? stayDates(criteria) : [];
  const searchUrl = "/multi-property/disponibilidad/buscar" + (criteria ? "?" + new URLSearchParams({ start: criteria.startDate, end: criteria.endDate, roomType: criteria.roomType }).toString() : "");
  return <section className={styles.page}>
    <h1 className={styles.title}>Resultados de disponibilidad</h1>
    <ScopeSummary />
    {!allowed ? <p role="status">Tu rol no tiene habilitada la comparación entre propiedades.</p> : !dates.length ? <p role="alert">Define un rango válido desde el buscador antes de consultar resultados.</p> : <>
      <p>{criteria?.startDate} → {criteria?.endDate} · {dates.length} noches · {criteria?.roomType || "Todos los tipos"}</p>
      <PortfolioState context={context} query={query} empty={rows.length === 0} />
      {context.scope && !query.isError && !query.isPending && rows.length > 0 && <div className={styles.card}>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Disponibilidad por propiedad y fecha">
          <table className={styles.table}><thead><tr><th className={styles.th} scope="col">Propiedad / RoomType</th>{dates.map(date => <th scope="col" className={styles.th} key={date}>{date} ATS</th>)}<th className={styles.th} scope="col">ATS estancia</th><th className={styles.th} scope="col">Tarifa / noche</th><th className={styles.th} scope="col">Estado</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.propertyId + ":" + row.roomTypeId}>
              <th scope="row" className={styles.td}>{row.propertyId} · {row.roomTypeName}<small className={styles.propertyZone}>{session.memberships.find(item => item.propertyId === row.propertyId)?.timezone}</small></th>
              {row.daily.map(day => <td className={styles.td} key={day.date}>{day.ats}</td>)}
              <td className={styles.td}>{row.stayAts}</td><td className={styles.td}>{formatAmount(row.nightlyRate, row.currency)}</td><td className={styles.td}>{row.stayAts > 0 ? "Disponible" : "Sin disponibilidad"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p>Comparación informativa de demostración. No crea reservas, traslada estancias ni modifica inventario.</p>
      </div>}
    </>}
    <div className={styles.footerActions}><Link className={styles.btnOutline} href={searchUrl}>Cambiar búsqueda</Link><Link className={styles.btnOutline} href="/multi-property">Dashboard Multi-property</Link></div>
  </section>;
}
