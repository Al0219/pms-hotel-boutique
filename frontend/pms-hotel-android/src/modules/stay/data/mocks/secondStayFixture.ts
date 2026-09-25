import { type ReservationStayDto } from "@/modules/stay/data/dtos/ReservationStayDto";

/** Minimal second linked stay used only to exercise account-scoped context selection. */
export const secondStayFixture: ReservationStayDto = {
  id: "stay-2026-004982",
  reservationId: "HB-2026-004982",
  roomType: { id: "deluxe-twin", name: "Deluxe Twin" },
  room: { id: "room-118", number: "118" },
  arrival: "2026-10-03",
  departure: "2026-10-09",
  status: "REMOTE_STATUS",
};
