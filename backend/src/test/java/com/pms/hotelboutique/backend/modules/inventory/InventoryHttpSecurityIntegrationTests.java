package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Real servlet error dispatch is not simulated by MockMvc. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
class InventoryHttpSecurityIntegrationTests {
    private static final UUID PROPERTY = UUID.randomUUID();
    private static final UUID TYPE = UUID.randomUUID();
    private static final StaffPrincipal STAFF = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "reception", "RECEPCION");
    @Autowired Environment environment;
    @Autowired StaffJwtService jwt;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;
    @MockitoBean AvailabilityPort availability;

    @Test
    void propertyDenialRemains403InTheRealServletContainer() throws Exception {
        grant(Set.of("RESERVATION_MANAGE", "MULTI_PROPERTY_READ"));
        when(availability.calculateATS(any(UUID.class), any(UUID.class), any(StayDateRange.class))).thenReturn(1);
        String token = jwt.issue(STAFF, Instant.now());
        assertEquals(200, request(PROPERTY, token).statusCode());
        var denied = request(UUID.randomUUID(), token);
        assertEquals(403, denied.statusCode());
        assertEquals("", denied.body());
        verify(availability, times(1)).calculateATS(eq(PROPERTY), eq(TYPE), any(StayDateRange.class));
    }

    @Test
    void permissionDenialRemains403WithoutRunningATS() throws Exception {
        grant(Set.of("AUDIT_READ"));
        assertEquals(403, request(PROPERTY, jwt.issue(STAFF, Instant.now())).statusCode());
        verifyNoInteractions(availability);
    }

    private void grant(Set<String> permissions) {
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(STAFF);
        var property = new StaffAuthorizationSnapshot.PropertyAccess(PROPERTY, "HB-GT-001", "Hotel", "America/Guatemala", "GTQ");
        when(authorization.resolve(STAFF.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(
                UUID.randomUUID(), STAFF.roleCode(), permissions, List.of(property)));
    }

    private HttpResponse<String> request(UUID propertyId, String token) throws Exception {
        int port = environment.getRequiredProperty("local.server.port", Integer.class);
        var uri = URI.create("http://127.0.0.1:" + port + "/api/v1/properties/" + propertyId
                + "/availability?roomTypeId=" + TYPE + "&arrival=2026-11-01&departure=2026-11-03");
        var request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + token).GET().build();
        try (var client = HttpClient.newHttpClient()) {
            return client.send(request, HttpResponse.BodyHandlers.ofString());
        }
    }
}
