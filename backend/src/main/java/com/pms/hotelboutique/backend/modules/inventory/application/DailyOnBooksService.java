package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.time.LocalDate;
import java.util.UUID;

/** Staff-only report entry point; CSV generation includes transactional audit. */
public interface DailyOnBooksService {
    DailyOnBooksReport forProperty(StaffPrincipal principal, UUID propertyId, LocalDate from, LocalDate to);

    DailyOnBooksReport forAllAuthorizedProperties(StaffPrincipal principal, LocalDate from, LocalDate to);

    byte[] exportForProperty(StaffPrincipal principal, UUID propertyId, LocalDate from, LocalDate to);

    byte[] exportForAllAuthorizedProperties(StaffPrincipal principal, LocalDate from, LocalDate to);
}
