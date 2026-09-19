import { IntegrationCenter } from "@/modules/integrations";

/**
 * Dev stub: propertyId/endpoint deben resolverse desde la sesion de Staff Auth
 * y el contrato confirmado por Backend. Mientras no exista esa composicion,
 * se inyectan via env solo en desarrollo (.env.development.local).
 */
export default function IntegrationsPage() {
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const endpoint = "http://pms.test/integrations";

  return <IntegrationCenter propertyId={propertyId} endpoint={endpoint} />;
}
