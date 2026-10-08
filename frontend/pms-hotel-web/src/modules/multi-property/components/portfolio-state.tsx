"use client";
import { usePropertyScope, type PropertyScope } from "@/modules/properties";
import styles from "./multi-property.module.css";
export function ScopeSummary() {
  const { scope } = usePropertyScope();
  return <p className={styles.scopeBanner}>Contexto: {scope ? scope.kind + " · " + scope.propertyIds.join(" · ") : "Sin propiedad seleccionada"}. Datos de demostración.</p>;
}
export function PortfolioState({ context, query, empty }: {
  context: { ready: boolean; scope: PropertyScope | null };
  query: { isPending: boolean; isError: boolean; fetchStatus: string; refetch: () => unknown };
  empty: boolean;
}) {
  if (!context.ready) return <p role="status">Cargando contexto…</p>;
  if (!context.scope) return <p role="status">Selecciona una propiedad autorizada en el encabezado para continuar.</p>;
  if (query.fetchStatus === "paused") return <p role="status">Sin conexión. La consulta continuará al reconectar.</p>;
  if (query.isPending) return <p role="status">Cargando datos de las propiedades seleccionadas…</p>;
  if (query.isError) return <div role="alert"><p>No se pudieron cargar los datos de este contexto.</p><button className={styles.btnOutline} onClick={() => void query.refetch()}>Reintentar consulta</button></div>;
  if (empty) return <p role="status">No hay datos para las propiedades y los criterios seleccionados.</p>;
  return null;
}
export function formatAmount(amount: number | null, currency: string) {
  return amount === null ? "Sin base disponible" : new Intl.NumberFormat("es-GT", { style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 2 }).format(amount);
}
