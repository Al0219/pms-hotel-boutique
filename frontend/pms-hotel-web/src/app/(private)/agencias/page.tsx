import { AgencyCenter } from "@/modules/agencies";

/**
 * Dev stub: propertyId/endpoint deben resolverse desde la sesión de Staff Auth
 * y el contrato confirmado por Backend. Mientras no exista esa composición,
 * se inyectan vía env solo en desarrollo (.env.development.local).
 */
export default function AgenciesPage() {
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const endpoint = process.env.NEXT_PUBLIC_API_BASE_URL;

  return <AgencyCenter propertyId={propertyId} endpoint={endpoint} />;
}
