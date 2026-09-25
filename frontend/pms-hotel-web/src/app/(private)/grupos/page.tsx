import { GroupCenter } from "@/modules/groups";

/**
 * Dev stub: propertyId/endpoint deben resolverse desde la sesion de Staff Auth
 * y el contrato confirmado por Backend. Mientras no exista esa composicion,
 * se inyectan via env solo en desarrollo (.env.development.local).
 */
export default function GroupsPage() {
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const endpoint = "http://pms.test/groups";

  return <GroupCenter propertyId={propertyId} endpoint={endpoint} />;
}
