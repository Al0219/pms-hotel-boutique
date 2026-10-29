package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.DailyArrivalsDeparturesRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DailyArrivalsDeparturesLimitsTests {
    @Test void allowsExactly50000RequestedRowsAndEmptyResponse() {
        var f = fixture(250);
        when(f.repository.findCurrent(any(), any(), any())).thenReturn(List.of());
        assertTrue(f.service.read(f.staff, null, LocalDate.parse("2035-01-01"), LocalDate.parse("2035-07-19")).rows().isEmpty());
        verify(f.repository).findCurrent(any(), any(), any());
    }

    @Test void rejectsExactly50001RequestedRowsBeforeQuery() {
        var f = fixture(2381);
        assertThrows(IllegalArgumentException.class, () -> f.service.read(f.staff, null, LocalDate.parse("2035-01-01"), LocalDate.parse("2035-01-21")));
        verifyNoInteractions(f.repository);
    }

    private Fixture fixture(int count) {
        var sessions = mock(StaffAuthService.class); var authorization = mock(StaffAuthorizationService.class);
        var repository = mock(DailyArrivalsDeparturesRepository.class);
        var staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "arrdep-limits-fixture", "GERENCIA");
        var properties = new ArrayList<StaffAuthorizationSnapshot.PropertyAccess>();
        for (int i = 0; i < count; i++) properties.add(new StaffAuthorizationSnapshot.PropertyAccess(UUID.randomUUID(), "fixture", "Fixture", "UTC", "GTQ"));
        when(sessions.getActivePrincipal(staff)).thenReturn(staff);
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(UUID.randomUUID(), "GERENCIA", Set.of("COMMERCIAL_MANAGE", "MULTI_PROPERTY_READ"), properties));
        return new Fixture(new DailyArrivalsDeparturesService(sessions, authorization, new PropertyScopeResolver(), repository), repository, staff);
    }
    record Fixture(DailyArrivalsDeparturesService service, DailyArrivalsDeparturesRepository repository, StaffPrincipal staff) { }
}
