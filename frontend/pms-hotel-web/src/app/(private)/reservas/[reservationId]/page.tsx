import { ReservationDetail } from "@/modules/reservations";

/**
 * Dev stub: propiedad y endpoint salen de env de desarrollo hasta que
 * la sesión de Staff Auth y el contrato de Backend estén confirmados.
 */
export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = await params;
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const endpoint = process.env.NEXT_PUBLIC_API_BASE_URL;

  return <ReservationDetail reservationId={reservationId} propertyId={propertyId} endpoint={endpoint} />;
}
