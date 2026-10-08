import { ErrorQueue } from "@/modules/integrations";

/**
 * Dev stub: propertyId/endpoint deben resolverse desde la sesion de Staff Auth
 * y el contrato confirmado por Backend. Mientras no exista esa composicion,
 * se inyectan via env solo en desarrollo (.env.development.local).
 */
export default async function IntegrationErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ integrationId?: string }>;
}) {
  const { integrationId } = await searchParams;
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const endpoint = "http://pms.test/integration-errors";

  return <ErrorQueue propertyId={propertyId} endpoint={endpoint} initialIntegrationId={integrationId} />;
}
