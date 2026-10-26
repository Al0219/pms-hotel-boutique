package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestReservationHistoryPort;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestReservationHistoryService;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class GuestReservationHistoryResponse {
    private GuestReservationHistoryResponse() { }
    @Schema(name = "GuestReservationHistoryPage")
    public record Page(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID guestAccountId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") int page,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "1", maximum = "50") int size,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long totalElements,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<Item> items) {
        static Page from(GuestReservationHistoryService.Page page) {
            return new Page(page.guestAccountId(), page.page(), page.size(), page.totalElements(), page.items().stream().map(Item::from).toList());
        }
    }
    @Schema(name = "GuestReservationHistoryDetail")
    public record Detail(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID guestAccountId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Item reservation) {
        static Detail from(GuestReservationHistoryService.Detail detail) { return new Detail(detail.guestAccountId(), Item.from(detail.reservation())); }
    }
    @Schema(name = "GuestReservationHistoryItem")
    public record Item(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID reservationId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String confirmationCode,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"PENDING","CONFIRMED","CANCELLED"}) String status,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID propertyId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String propertyName,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String propertyTimeZone,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true) String bookingGuestName,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<Stay> stays) {
        static Item from(GuestReservationHistoryPort.Reservation r) {
            return new Item(r.reservationId(),r.confirmationCode(),r.status(),r.propertyId(),r.propertyName(),r.propertyTimeZone(),r.bookingGuestName(),
                    r.stays().stream().map(s -> new Stay(s.reservationStayId(),s.roomTypeId(),s.roomTypeName(),s.arrival(),s.departure(),s.status())).toList());
        }
    }
    @Schema(name = "GuestReservationHistoryStay")
    public record Stay(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID reservationStayId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID roomTypeId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String roomTypeName,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate arrival,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate departure,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"RESERVED","IN_HOUSE","CHECKED_OUT","CANCELLED","NO_SHOW"}) String status) { }
}
