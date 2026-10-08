/** Existing UI catalogue; these values are not Backend authorization policies. */
export const permissionGroups = [
  { title: "Multi-property & Dashboard", permissions: [
    { id: "MULTI_PROPERTY_READ", description: "Ver métricas consolidadas." },
    { id: "COMPARE_AVAILABILITY", description: "Buscador cross-property." },
  ] },
  { title: "Reservas & Rebooking", permissions: [
    { id: "CREATE_RESERVATION", description: "Crear reservas." },
    { id: "CROSS_PROPERTY_REBOOKING", description: "Trasladar stays entre propiedades." },
    { id: "BYPASS_RESTRICTIONS", description: "No editable en esta demostración." },
  ] },
  { title: "Revenue & Tarifas", permissions: [
    { id: "VIEW_RATES", description: "Visualizar tarifas." },
    { id: "RATE_OVERRIDE", description: "Modificar tarifas manualmente." },
  ] },
] as const;
export const permissionIds = permissionGroups.flatMap(group => group.permissions.map(permission => permission.id));
export const exampleProperties = ["GT-HB-01", "GT-HB-03"] as const;

