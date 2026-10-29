package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.DailyOnBooksService;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Real servlet dispatch, not MockMvc; catches protected /error regressions. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
class DailyOnBooksCsvServletIntegrationTests {
    @LocalServerPort int port;
    @Autowired StaffJwtService jwt;
    @MockitoBean DailyOnBooksService reports;
    @MockitoBean StaffAuthService sessions;
    private final HttpClient client = HttpClient.newHttpClient();
    private StaffPrincipal staff;

    @BeforeEach void session() {
        staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "servlet-csv-fixture", "RECEPCION");
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
    }

    private HttpResponse<byte[]> get(String query, String accept) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/reports/on-books/daily/export?" + query))
                .header("Authorization", "Bearer " + jwt.issue(staff, Instant.now())).header("Accept", accept).GET().build(),
                HttpResponse.BodyHandlers.ofByteArray());
    }

    @Test void incompatibleAcceptStays406WithoutGenerationOrErrorRedispatch() throws Exception {
        for (String accept : new String[]{"application/json", "text/csv;q=0, */*;q=1"}) {
            var response = get("from=2035-01-01&to=2035-01-01&scope=ALL_PROPERTIES", accept);
            assertEquals(406, response.statusCode());
            assertEquals("private, no-store", response.headers().firstValue("Cache-Control").orElseThrow());
            assertTrue(response.headers().firstValue("Content-Disposition").isEmpty());
        }
        verifyNoInteractions(reports);
    }

    @Test void invalidFiltersRemain400AndGenerationFailuresRemain503WithoutInternalDetails() throws Exception {
        assertEquals(400, get("from=2035-02-30&to=2035-03-01&scope=ALL_PROPERTIES", "text/csv").statusCode());
        when(reports.exportForAllAuthorizedProperties(any(), any(), any())).thenThrow(new IllegalStateException("internal-sensitive-error"));
        var response = get("from=2035-01-01&to=2035-01-01&scope=ALL_PROPERTIES", "text/csv");
        assertEquals(503, response.statusCode());
        assertEquals("private, no-store", response.headers().firstValue("Cache-Control").orElseThrow());
        assertFalse(new String(response.body(), StandardCharsets.UTF_8).contains("internal-sensitive"));
        assertTrue(response.headers().firstValue("Content-Disposition").isEmpty());
    }

    @Test void metadataProbesAndOtherMethodsCannotGenerateAnExport() throws Exception {
        for (String method : new String[]{"HEAD", "POST"}) {
            var response = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/reports/on-books/daily/export"))
                    .header("Authorization", "Bearer " + jwt.issue(staff, Instant.now())).method(method, HttpRequest.BodyPublishers.noBody()).build(),
                    HttpResponse.BodyHandlers.ofByteArray());
            assertEquals(403, response.statusCode());
        }
        verifyNoInteractions(reports);
    }
}
