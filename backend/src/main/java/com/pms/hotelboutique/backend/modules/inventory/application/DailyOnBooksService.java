package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.time.LocalDate;
import java.util.UUID;

/** Staff-only internal report entry point. HTTP/BFF contract remains pending. */
public interface DailyOnBooksService {
    DailyOnBooksReport forProperty(StaffPrincipal principal, UUID propertyId, LocalDate from, LocalDate to);

    DailyOnBooksReport forAllAuthorizedProperties(StaffPrincipal principal, LocalDate from, LocalDate to);
}
