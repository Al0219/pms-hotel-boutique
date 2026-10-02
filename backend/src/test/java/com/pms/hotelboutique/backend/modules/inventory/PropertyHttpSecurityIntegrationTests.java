package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
class PropertyHttpSecurityIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private final StaffPrincipal staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "http-test", "SUPER_ADMIN");
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired Environment environment;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;

    @Test
    void preservesActualHttp401And403AndAllowsScopedStaffRead() throws Exception {
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
        var property = new StaffAuthorizationSnapshot.PropertyAccess(PROPERTY, "HB-GT-001", "Hotel", "America/Guatemala", "GTQ");
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(ORGANIZATION,
                "OPERACIONES", Set.of("AUDIT_READ"), List.of(property)));
        String token = jwt.issue(staff, Instant.now());
        assertEquals(401, request("/api/v1/properties", null).statusCode());
        assertEquals(401, request("/api/v1/properties", "invalid").statusCode());
        String guestToken = guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), "guest@example.test"), Instant.now());
        assertEquals(401, request("/api/v1/properties", guestToken).statusCode());
        assertEquals(403, request("/api/v1/properties", token).statusCode());
        assertEquals(200, request("/api/v1/properties/" + PROPERTY, token).statusCode());
        assertEquals(403, request("/api/v1/properties/" + UUID.randomUUID(), token).statusCode());
        when(sessions.getActivePrincipal(any(StaffPrincipal.class)))
                .thenThrow(new StaffAuthenticationException());
        assertEquals(401, request("/api/v1/properties/" + PROPERTY, token).statusCode());
    }

    @Test
    void preservesTimestampPrecisionAcrossCommittedHttpRequestsAndNoOp() throws Exception {
        UUID organization = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at) "
                + "VALUES (?,'HTTP Precision',?,'ACTIVE',now(),now())", organization, "HTTP-" + organization);
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(organization,
                "SUPER_ADMIN", Set.of("STAFF_MANAGE", "COMMERCIAL_MANAGE"), List.of()));
        String token = jwt.issue(staff, Instant.now());
        var created = write("POST", "/api/v1/properties", token,
                "{\"code\":\"HTTP\",\"name\":\"Precision\",\"timezone\":\"America/Guatemala\",\"currency\":\"GTQ\"}");
        assertEquals(201, created.statusCode());
        var before = json.readTree(created.body());
        UUID id = UUID.fromString(before.get("id").asText());
        var access = new StaffAuthorizationSnapshot.PropertyAccess(id, "HTTP", "Precision", "America/Guatemala", "GTQ");
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(organization,
                "SUPER_ADMIN", Set.of("COMMERCIAL_MANAGE"), List.of(access)));
        var read = request("/api/v1/properties/" + id, token);
        assertEquals(200, read.statusCode());
        assertEquals(before.get("createdAt"), json.readTree(read.body()).get("createdAt"));
        var changed = write("PATCH", "/api/v1/properties/" + id, token, "{\"name\":\"Edited\"}");
        assertEquals(200, changed.statusCode());
        var edited = json.readTree(changed.body());
        assertEquals(before.get("createdAt"), edited.get("createdAt"));
        var replay = write("PATCH", "/api/v1/properties/" + id, token, "{\"name\":\"Edited\"}");
        assertEquals(200, replay.statusCode());
        assertEquals(edited, json.readTree(replay.body()));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE entity_type='PROPERTY' AND entity_id=?",
                Integer.class, id));
        // Committed history remains append-only; fixtures belong to this disposable QA database.
    }

    private HttpResponse<String> write(String method, String path, String token, String body) throws Exception {
        var uri = URI.create("http://127.0.0.1:" + environment.getRequiredProperty("local.server.port", Integer.class) + path);
        var request = HttpRequest.newBuilder(uri).header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(body));
        try (var client = HttpClient.newHttpClient()) {
            return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }
    }

    private HttpResponse<String> request(String path, String token) throws Exception {
        var uri = URI.create("http://127.0.0.1:" + environment.getRequiredProperty("local.server.port", Integer.class) + path);
        var request = HttpRequest.newBuilder(uri).GET();
        if (token != null) { request.header("Authorization", "Bearer " + token); }
        try (var client = HttpClient.newHttpClient()) {
            return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }
    }
}
