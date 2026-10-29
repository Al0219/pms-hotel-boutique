"use client";

import { useStaffSession } from "@/modules/auth";
import { usePropertyScope } from "@/modules/properties";
import { ReportsCatalog } from "@/modules/reports";

export function StaffReportsWorkspace() {
  const session = useStaffSession();
  const { ready, scope } = usePropertyScope();

  if (!session.permissions.includes("COMMERCIAL_MANAGE") && !session.permissions.includes("RESERVATION_MANAGE") &&
      !session.permissions.includes("OPERATIONS_MANAGE")) {
    return <main><h1>Reportes</h1><p role="alert">Tu sesión no tiene permiso para consultar este reporte.</p></main>;
  }
  if (!ready) return <p role="status">Preparando la propiedad de tu sesión…</p>;
  if (!scope) return <main><h1>Reportes</h1><p>Selecciona una propiedad autorizada.</p></main>;
  if (scope.kind === "ALL_PROPERTIES" && !session.permissions.includes("MULTI_PROPERTY_READ")) {
    return <main><h1>Reportes</h1><p role="alert">Tu sesión no tiene permiso para consultar todas las propiedades.</p></main>;
  }

  const scopeKey = scope.kind === "PROPERTY" ? scope.propertyIds[0] : "ALL_PROPERTIES";
  const names = Object.fromEntries(session.memberships.filter(item => item.active).map(item => [item.propertyId, item.name]));
  return <ReportsCatalog key={`${session.id}:${scopeKey}`} sessionId={session.id} scope={scope} propertyNames={names}
    canReadReservations={session.permissions.includes("COMMERCIAL_MANAGE") || session.permissions.includes("RESERVATION_MANAGE")}
    canReadHousekeeping={session.permissions.includes("OPERATIONS_MANAGE")} />;
}
