import { DomainMappingError } from "@/domain/errors/DomainMappingError";
import {
  mapReservationStayDto,
  MockStayService,
  type ReservationStayDto,
} from "@/modules/stay";

const context = { reservationId: "reservation-1", reservationStayId: "stay-1" };

const stayDto: ReservationStayDto = {
  id: "stay-1",
  reservationId: "reservation-1",
  confirmationCode: "ABC1234567",
  roomType: {
    id: "room-type-1",
    name: "Deluxe King",
  },
  room: {
    id: "room-101",
    number: "101",
  },
  arrival: "2026-09-10",
  departure: "2026-09-12",
  status: "REMOTE_STATUS",
};

describe("Stay contracts", () => {
  it("maps a mock DTO into a ReservationStay domain model without defaults", () => {
    const stay = mapReservationStayDto(stayDto);

    expect(stay).toMatchObject({
      id: "stay-1",
      reservationId: "reservation-1",
      confirmationCode: "ABC1234567",
      roomType: { id: "room-type-1", name: "Deluxe King" },
      room: { id: "room-101", number: "101" },
      arrival: "2026-09-10",
      departure: "2026-09-12",
    });
    expect(stay.status).toBe("REMOTE_STATUS");
  });

  it("preserves an unassigned room and rejects invalid required DTO fields", () => {
    expect(mapReservationStayDto({ ...stayDto, room: null }).room).toBeNull();
    expect(() => mapReservationStayDto({ ...stayDto, arrival: " " })).toThrow(
      DomainMappingError,
    );
  });

  it("keeps the mock at the service boundary without an endpoint", async () => {
    await expect(
      new MockStayService({ kind: "success", dto: stayDto }).getCurrentStay(
        context,
      ),
    ).resolves.toBe(stayDto);
    await expect(
      new MockStayService({
        kind: "error",
        error: new Error("remote failure"),
      }).getCurrentStay(context),
    ).rejects.toThrow("remote failure");
  });
});

it.each([undefined, null, '', '   '])('maps unavailable reference %s to neutral without reusing the reservation ID', (confirmationCode) => {
  const stay = mapReservationStayDto({ ...stayDto, confirmationCode });
  expect(stay.confirmationCode).toBeNull();
  expect(stay.reservationId).toBe('reservation-1');
  expect(stay.id).toBe('stay-1');
});
it('maps the provided code without changing internal identities', () => {
  const stay = mapReservationStayDto({ ...stayDto, confirmationCode: ' ABC1234567 ' });
  expect(stay.confirmationCode).toBe('ABC1234567');
  expect(stay.reservationId).toBe('reservation-1');
});
