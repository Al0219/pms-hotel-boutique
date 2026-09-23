import { CompanyCenter } from "@/modules/companies";

/**
 * Dev stub: propertyId/endpoint deben resolverse desde la sesion de Staff Auth
 * y el contrato confirmado por Backend. Mientras no exista esa composicion,
 * se inyectan via env solo en desarrollo (.env.development.local).
 */
export default function CompaniesPage() {
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const endpoint = "http://pms.test/companies";

  return <CompanyCenter propertyId={propertyId} endpoint={endpoint} />;
}
