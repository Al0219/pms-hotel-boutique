import { RolesPage, type RolePreview } from "@/modules/permissions";

// Authorized UI examples, not an API or an authorization policy.
const roles: readonly RolePreview[] = [
  { id: "superadmin", name: "SuperAdmin", users: 2 },
  { id: "gerencia", name: "Gerencia", users: 12,
    description: "Acceso administrativo a nivel de propiedad y reportes multi-property.",
    properties: ["GT-HB-01", "GT-HB-03"],
    permissions: ["MULTI_PROPERTY_READ", "COMPARE_AVAILABILITY", "CREATE_RESERVATION", "CROSS_PROPERTY_REBOOKING", "VIEW_RATES", "RATE_OVERRIDE"],
  },
  { id: "recepcion", name: "Recepción", users: 45 },
  { id: "reservas-central", name: "Reservas Central", users: 8 },
  { id: "auditoria", name: "Auditoría", users: 4 },
];

export default function RolesRoute() {
  return <RolesPage initialRoles={roles} />;
}
