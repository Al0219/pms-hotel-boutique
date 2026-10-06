package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Scoped read model; only explicit account/profile and OTP reservation links authorize reads. */
public interface GuestAccountSummaryPort {
    AccountData readForAccount(UUID guestAccountId);

    record AccountData(List<Profile> profiles, long linkedReservationsCount, UpcomingStay upcomingStay) { }
    record Profile(UUID profileId, String firstName, String lastName, String preferredLanguage, String status) { }
    record UpcomingStay(UUID reservationId, UUID stayId, String confirmationCode, LocalDate arrival, LocalDate departure) { }
}
