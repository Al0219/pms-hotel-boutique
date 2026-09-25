import { AgencyCenter } from "@/modules/agencies";

/**
 * Dev stub: propertyId/endpoint deben resolverse desde la sesion de Staff Auth
 * y el contrato confirmado por Backend. Mientras no exista esa composicion,
 * se inyectan via env solo en desarrollo (.env.development.local).
 */
export default function AgenciesPage() {
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const endpoint = "http://pms.test/agencies";

  return <AgencyCenter propertyId={propertyId} endpoint={endpoint} />;
}
