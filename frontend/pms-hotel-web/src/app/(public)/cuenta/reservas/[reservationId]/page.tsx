import { ReservationHistoryDetail } from "@/modules/account";
export default async function Page({ params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;
  return <ReservationHistoryDetail reservationId={reservationId} />;
}
