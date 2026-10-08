import { CalendarGantt } from "@/modules/reservations";

/**
 * Dev stub: propertyId/endpoints deben resolverse desde la sesión de Staff Auth
 * y el contrato confirmado por Backend. Mientras no exista esa composición,
 * se inyectan vía env solo en desarrollo (.env.development.local).
 */
export default function CalendarPage() {
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const reservationsEndpoint = process.env.NEXT_PUBLIC_API_BASE_URL;
  const roomsEndpoint = "http://pms.test/rooms";

  return (
    <CalendarGantt
      propertyId={propertyId}
      reservationsEndpoint={reservationsEndpoint}
      roomsEndpoint={roomsEndpoint}
    />
  );
}
