package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.CurrentHousekeepingReportService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
class CurrentHousekeepingReportServletTests {
    @LocalServerPort int port;
    @Autowired StaffJwtService jwt;
    @MockitoBean CurrentHousekeepingReportService reports;
    @MockitoBean StaffAuthService sessions;
    private StaffPrincipal staff;

    @BeforeEach void session() {
        staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "hk-servlet-fixture", "OPERACIONES");
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
    }

    private HttpResponse<String> get(String query) throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:" + port
                        + "/api/v1/reports/housekeeping/current?" + query))
                .header("Authorization", "Bearer " + jwt.issue(staff, Instant.now())).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test void invalidFiltersRemain400OnRealServlet() throws Exception {
        var response = get("propertyId=not-a-uuid");
        assertEquals(400, response.statusCode());
        assertEquals("private, no-store", response.headers().firstValue("Cache-Control").orElseThrow());
        verifyNoInteractions(reports);
    }

    @Test void unavailableSourceRemains503WithoutPrivateDetails() throws Exception {
        when(reports.read(any(), any())).thenThrow(new DataAccessResourceFailureException("private-sql-detail"));
        var response = get("propertyId=" + UUID.randomUUID());
        assertEquals(503, response.statusCode());
        assertEquals("private, no-store", response.headers().firstValue("Cache-Control").orElseThrow());
        assertFalse(response.body().contains("private-sql-detail"));
    }
}
