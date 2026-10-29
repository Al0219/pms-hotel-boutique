package com.pms.hotelboutique.backend.modules.guestauth.application;
import java.util.UUID;
/** Authority is a persisted account/reservation/property link, not matching email. */
public interface GuestReservationSummaryPort {
    PublicReservationLookupReadPort.Result findLinked(UUID guestAccountId, UUID reservationId);
}
