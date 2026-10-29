package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.util.List;
import java.time.Instant;
import java.util.UUID;
import io.swagger.v3.oas.annotations.media.Schema;

/** Both credentials are supplied together; never exposes an email-wide history. */
public interface PublicReservationLookupReadPort {
    @Schema(name="PublicReservationLookupResult", requiredProperties={"stays","details","overview","accommodations"})
    record Result(List<GuestReservationReadPort.LinkedStay> stays, List<GuestReservationReadPort.Stay> details,
            Overview overview, List<Accommodation> accommodations) { }
    @Schema(name="PublicReservationLookupOverview", requiredProperties={"createdAt","source","currency","confirmedTotalMinor"})
    record Overview(Instant createdAt, @Schema(types={"string","null"}) String source, String currency,
            @Schema(types={"integer","null"}, format="int64", description="Original total from a coherent immutable public receipt; null when absent. Not a current balance or payment.") Long confirmedTotalMinor) { }
    @Schema(name="PublicReservationLookupAccommodation", requiredProperties={"stayId","roomTypeCode","timezone"})
    record Accommodation(UUID stayId, String roomTypeCode, String timezone) { }
    Result find(String email, String confirmationCode);
}
