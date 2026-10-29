package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.DailyArrivalsDeparturesService;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
class DailyArrivalsDeparturesServletTests {
    @LocalServerPort int port;
    @Autowired StaffJwtService jwt;
    @MockitoBean DailyArrivalsDeparturesService reports;
    @MockitoBean StaffAuthService sessions;
    private StaffPrincipal staff;
    @BeforeEach void session() {
        staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "arrdep-servlet-fixture", "RECEPCION");
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
    }
    private HttpResponse<String> get(String query) throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/reports/arrivals-departures/daily?" + query))
                .header("Authorization", "Bearer " + jwt.issue(staff, Instant.now())).GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void invalidDatesRemain400OnRealServletWithoutErrorRedispatch() throws Exception {
        var response = get("from=2035-02-30&to=2035-03-01&scope=ALL_PROPERTIES");
        assertEquals(400, response.statusCode()); assertEquals("private, no-store", response.headers().firstValue("Cache-Control").orElseThrow());
        verifyNoInteractions(reports);
    }
    @Test void unavailableSourceRemains503AndHidesInternalDetails() throws Exception {
        when(reports.read(any(), any(), any(), any())).thenThrow(new DataAccessResourceFailureException("private-sql-detail"));
        var response = get("from=2035-01-01&to=2035-01-01&propertyId=" + UUID.randomUUID());
        assertEquals(503, response.statusCode()); assertEquals("private, no-store", response.headers().firstValue("Cache-Control").orElseThrow());
        assertFalse(response.body().contains("private-sql-detail"));
    }
}
