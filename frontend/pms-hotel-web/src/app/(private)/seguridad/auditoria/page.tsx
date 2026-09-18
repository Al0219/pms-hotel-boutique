import { AuditPage, type AuditEntry } from "@/modules/audit";

// UI demonstration supplied at the composition boundary; not an API contract.
const demonstrationEntries: readonly AuditEntry[] = [
  { id: "LOG-99381", date: "17 sep 2026 · 10:42", actor: "María López", role: "Gerencia", module: "Reservas", action: "CROSS_PROPERTY_REBOOKING", property: "GT-HB-01", status: "SUCCESS", detail: "Reserva DEMO-2048: rebooking de GT-HB-01 a GT-HB-03 aplicado tras confirmar la evaluación." },
  { id: "LOG-99380", date: "17 sep 2026 · 10:35", actor: "Carlos Méndez", role: "Recepción", module: "Autenticación", action: "FAILED_LOGIN", property: "GT-HB-03", status: "CRITICAL", detail: "Intentos de acceso fallidos consecutivos. Evento remitido a revisión de seguridad." },
  { id: "LOG-99379", date: "17 sep 2026 · 10:18", actor: "Ana García", role: "Gerencia", module: "Revenue", action: "RATE_OVERRIDE", property: "GT-HB-01", status: "WARNING", detail: "Tarifa Deluxe King modificada de GTQ 950 a GTQ 850. Motivo: acuerdo comercial. Revisión pendiente." },
  { id: "LOG-99378", date: "17 sep 2026 · 09:56", actor: "Diego Ruiz", role: "Gerencia", module: "Roles / Permisos", action: "ACCESS_MATRIX_VIEWED", property: "GLOBAL", status: "INFO", detail: "Consulta de la matriz de acceso. Sin cambios en roles ni asignaciones de propiedades." },
  { id: "LOG-99377", date: "17 sep 2026 · 09:41", actor: "Sofía Herrera", role: "Recepción", module: "Reservas", action: "RESERVATION_CONFIRMED", property: "GT-HB-03", status: "SUCCESS", detail: "Reserva DEMO-2047 confirmada con 2 estancias. Referencia de operación conservada." },
];

export default function AuditRoute() {
  return <AuditPage entries={demonstrationEntries} />;
}
