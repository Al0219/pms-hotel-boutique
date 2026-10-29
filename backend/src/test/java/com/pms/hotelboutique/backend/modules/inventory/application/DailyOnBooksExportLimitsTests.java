package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.DailyOnBooksRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DailyOnBooksExportLimitsTests {
    @Test void acceptsExactly50000RequestedRowsAndAuditsEmptyResponseScopeWithCommercialOnly() {
        var fixture = fixture(250);
        when(fixture.repository.findCurrent(any(), any(), any())).thenReturn(List.of());
        byte[] csv = fixture.service.exportForAllAuthorizedProperties(fixture.staff, LocalDate.parse("2035-01-01"), LocalDate.parse("2035-07-19"));
        // 200 inclusive nights × 250 authorized properties = 50000 requested rows.
        assertTrue(csv.length > 3);
        verify(fixture.repository).findCurrent(any(), any(), any());
        verify(fixture.audit, times(250)).record(any());
    }

    @Test void rejectsExactly50001RequestedRowsBeforeQueryOrAudit() {
        var fixture = fixture(2381);
        assertThrows(IllegalArgumentException.class, () -> fixture.service.exportForAllAuthorizedProperties(
                fixture.staff, LocalDate.parse("2035-01-01"), LocalDate.parse("2035-01-21")));
        verifyNoInteractions(fixture.repository, fixture.audit);
    }

    private Fixture fixture(int count) {
        var sessions = mock(StaffAuthService.class);
        var authorization = mock(StaffAuthorizationService.class);
        var repository = mock(DailyOnBooksRepository.class);
        var audit = mock(AuditService.class);
        var staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "limits-fixture", "GERENCIA");
        var properties = new ArrayList<StaffAuthorizationSnapshot.PropertyAccess>();
        for (int i = 0; i < count; i++) properties.add(new StaffAuthorizationSnapshot.PropertyAccess(
                UUID.randomUUID(), "fixture", "Fixture", "UTC", "GTQ"));
        when(sessions.getActivePrincipal(staff)).thenReturn(staff);
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(UUID.randomUUID(),
                "GERENCIA", Set.of("COMMERCIAL_MANAGE", "MULTI_PROPERTY_READ"), properties));
        return new Fixture(new DailyOnBooksServiceImpl(sessions, authorization, new PropertyScopeResolver(), repository,
                audit, new ObjectMapper()), repository, audit, staff);
    }

    record Fixture(DailyOnBooksServiceImpl service, DailyOnBooksRepository repository, AuditService audit, StaffPrincipal staff) { }
}
