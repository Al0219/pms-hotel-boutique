import { ConciergeCenter } from "@/modules/concierge";

/**
 * Dev stub: propertyId/endpoint deben resolverse desde la sesion de Staff Auth
 * y el contrato confirmado por Backend. Mientras no exista esa composicion,
 * se inyectan via env solo en desarrollo (.env.development.local).
 */
export default function ConciergePage() {
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const endpoint = "http://pms.test/concierge-tasks";

  return <ConciergeCenter propertyId={propertyId} endpoint={endpoint} />;
}
