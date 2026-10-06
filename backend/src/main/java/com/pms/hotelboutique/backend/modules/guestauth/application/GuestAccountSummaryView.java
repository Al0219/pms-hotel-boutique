package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.util.List;
import java.util.UUID;

public record GuestAccountSummaryView(UUID guestAccountId, String email, boolean active,
        List<GuestAccountSummaryPort.Profile> profiles, long linkedReservationsCount,
        GuestAccountSummaryPort.UpcomingStay upcomingStay) { }
