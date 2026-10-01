package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Disposable shared key verifies Guest rejection by context/audience, not only by signature.
@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
class InventoryControllerIntegrationTests {
    private static final UUID PROPERTY = UUID.randomUUID();
    private static final UUID TYPE = UUID.randomUUID();
    private static final StaffPrincipal STAFF = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "reception", "RECEPCION");
    private static final StayDateRange DATES = new StayDateRange(LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-03"));

    @Autowired MockMvc mvc;
    @Autowired StaffJwtService staffJwt;
    @Autowired GuestJwtService guestJwt;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;
    @MockitoBean AvailabilityPort availability;

    @BeforeEach
    void authorizedSession() {
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(STAFF);
        grant("RESERVATION_MANAGE");
        when(availability.calculateATS(PROPERTY, TYPE, DATES)).thenReturn(2);
    }

    @Test
    void readsAvailabilityWithSignedStaffTokenAndExplicitProperty() throws Exception {
        mvc.perform(request().header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.propertyId").value(PROPERTY.toString()))
                .andExpect(jsonPath("$.roomTypeId").value(TYPE.toString()))
                .andExpect(jsonPath("$.arrival").value("2026-11-01"))
                .andExpect(jsonPath("$.departure").value("2026-11-03"))
                .andExpect(jsonPath("$.availableUnits").value(2));
        verify(availability).calculateATS(PROPERTY, TYPE, DATES);
    }

    @Test
    void acceptsCommercialPermissionFromLiveAuthorization() throws Exception {
        grant("COMMERCIAL_MANAGE");
        mvc.perform(request().header("Authorization", bearer())).andExpect(status().isOk());
    }

    @Test
    void returnsZeroAsSuccessfulAvailability() throws Exception {
        when(availability.calculateATS(PROPERTY, TYPE, DATES)).thenReturn(0);
        mvc.perform(request().header("Authorization", bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.availableUnits").value(0));
    }

    @Test
    void rejectsMissingMalformedAndExpiredTokensBeforeQuery() throws Exception {
        mvc.perform(request()).andExpect(status().isUnauthorized());
        mvc.perform(request().header("Authorization", "Bearer invalid")).andExpect(status().isUnauthorized());
        mvc.perform(request().header("Authorization", "Bearer " + staffJwt.issue(STAFF, Instant.now().minusSeconds(3600))))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(availability, authorization);
    }

    @Test
    void rejectsGuestTokenEvenWithTheSameSigningKey() throws Exception {
        var guest = new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), null);
        mvc.perform(request().header("Authorization", "Bearer " + guestJwt.issue(guest, Instant.now())))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(availability, authorization);
    }

    @Test
    void rejectsRevokedStaffSessionBeforeQuery() throws Exception {
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenThrow(new StaffAuthenticationException());
        mvc.perform(request().header("Authorization", bearer())).andExpect(status().isUnauthorized());
        verifyNoInteractions(availability, authorization);
    }

    @Test
    void checksPermissionsFromDatabaseForEachRequest() throws Exception {
        String token = bearer();
        mvc.perform(request().header("Authorization", token)).andExpect(status().isOk());
        grant("AUDIT_READ");
        mvc.perform(request().header("Authorization", token)).andExpect(status().isForbidden());
        verify(availability, times(1)).calculateATS(PROPERTY, TYPE, DATES);
    }

    @Test
    void rejectsOtherPropertiesEvenWithPortfolioPermission() throws Exception {
        grant("COMMERCIAL_MANAGE", "MULTI_PROPERTY_READ");
        mvc.perform(get("/api/v1/properties/{propertyId}/availability", UUID.randomUUID())
                        .param("roomTypeId", TYPE.toString()).param("arrival", "2026-11-01").param("departure", "2026-11-03")
                        .header("Authorization", bearer()))
                .andExpect(status().isForbidden());
        verifyNoInteractions(availability);
    }

    @Test
    void rejectsInvalidAndMissingParametersBeforeQuery() throws Exception {
        mvc.perform(get("/api/v1/properties/{propertyId}/availability", PROPERTY)
                        .param("roomTypeId", TYPE.toString()).param("arrival", "2026-11-03").param("departure", "2026-11-03")
                        .header("Authorization", bearer()))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/properties/{propertyId}/availability", PROPERTY)
                        .param("roomTypeId", "invalid").param("arrival", "2026-11-01").param("departure", "2026-11-03")
                        .header("Authorization", bearer()))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/properties/{propertyId}/availability", PROPERTY).header("Authorization", bearer()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        mvc.perform(get("/api/v1/properties/{propertyId}/availability", PROPERTY)
                        .param("roomTypeId", TYPE.toString()).param("arrival", "not-a-date").param("departure", "2026-11-03")
                        .header("Authorization", bearer()))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(availability);
    }

    @Test
    void reportsMissingRoomTypeWithoutExposingInternalErrors() throws Exception {
        when(availability.calculateATS(PROPERTY, TYPE, DATES)).thenThrow(new IllegalArgumentException("property or room type does not exist"));
        mvc.perform(request().header("Authorization", bearer()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Room type not found in the authorized property"));
    }

    @Test
    void documentsEndpointParametersSecurityAndErrors() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/properties/{propertyId}/availability'].get.security[0].bearerAuth").isArray())
                .andExpect(jsonPath("$.paths['/api/v1/properties/{propertyId}/availability'].get.responses['200']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/properties/{propertyId}/availability'].get.responses['403']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/properties/{propertyId}/availability'].get.responses['403'].content").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/v1/properties/{propertyId}/availability'].get.responses['404'].content['application/problem+json'].schema['$ref']").value("#/components/schemas/ProblemDetail"))
                .andExpect(jsonPath("$.components.schemas.AvailabilityResponse.properties.availableUnits.minimum").value(0));
    }

    private MockHttpServletRequestBuilder request() {
        return get("/api/v1/properties/{propertyId}/availability", PROPERTY)
                .param("roomTypeId", TYPE.toString()).param("arrival", "2026-11-01").param("departure", "2026-11-03");
    }

    private String bearer() {
        return "Bearer " + staffJwt.issue(STAFF, Instant.now());
    }

    private void grant(String... permissions) {
        var property = new StaffAuthorizationSnapshot.PropertyAccess(PROPERTY, "HB-GT-001", "Hotel", "America/Guatemala", "GTQ");
        when(authorization.resolve(STAFF.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(
                UUID.randomUUID(), STAFF.roleCode(), Set.of(permissions), List.of(property)));
    }
}
