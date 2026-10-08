"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStaffSession } from "@/modules/auth";
import { usePropertyScope } from "@/modules/properties";
import { stayDates, type ComparisonCriteria } from "../model/portfolio";
import { ScopeSummary } from "./portfolio-state";
import type { ViewProps } from "../types";
import styles from "./multi-property.module.css";
export function AvailabilitySearch({ onNavigate, criteria }: Partial<ViewProps> & { criteria?: ComparisonCriteria }) {
  const router = useRouter();
  const session = useStaffSession();
  const { scope } = usePropertyScope();
  const [startDate, setStartDate] = useState(criteria?.startDate ?? "2026-09-12");
  const [endDate, setEndDate] = useState(criteria?.endDate ?? "2026-09-14");
  const [roomType, setRoomType] = useState(criteria?.roomType ?? "");
  const [error, setError] = useState("");
  const allowed = session.permissions.includes("COMPARE_AVAILABILITY");
  return <section className={styles.page}>
    <h1 className={styles.title}>Disponibilidad cross-property</h1>
    <ScopeSummary />
    {!allowed ? <p role="status">Tu rol no tiene habilitada la comparación entre propiedades.</p> : <form className={styles.card} onSubmit={event => {
      event.preventDefault();
      if (!scope) { setError("Selecciona una propiedad autorizada."); return; }
      if (!stayDates({ startDate, endDate, roomType }).length) { setError("Elige una salida posterior a la entrada; esta demostración admite hasta 31 noches."); return; }
      setError("");
      const params = new URLSearchParams({ start: startDate, end: endDate, roomType });
      router.push("/multi-property/disponibilidad/resultados?" + params.toString());
    }}>
      <h2 className={styles.cardTitle}>Fechas y tipo de habitación</h2>
      <div className={styles.searchFields}>
        <label>Entrada<input type="date" required value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
        <label>Salida<input type="date" required value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
        <label>Tipo de habitación<input type="search" placeholder="Todos los tipos" value={roomType} onChange={event => setRoomType(event.target.value)} maxLength={100} /></label>
      </div>
      <p>Ejemplo disponible: noches del 12 y 13 de septiembre de 2026. Otras fechas pueden no tener datos de demostración.</p>
      {error && <p role="alert">{error}</p>}
      <button className={styles.btnOlive} disabled={!scope} type="submit">Buscar disponibilidad</button>
    </form>}
    {onNavigate ? <button className={styles.btnOutline} onClick={() => onNavigate("dashboard")}>Volver al dashboard</button> : <Link href="/multi-property" className={styles.btnOutline}>Volver al dashboard</Link>}
  </section>;
}
