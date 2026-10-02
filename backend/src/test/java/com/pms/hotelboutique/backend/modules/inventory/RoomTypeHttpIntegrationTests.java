package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
class RoomTypeHttpIntegrationTests {
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired Environment environment;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;

    @Test
    void commitsCatalogWritesAndPreservesNoOpTimestampsAcrossRequests() throws Exception {
        UUID org = UUID.randomUUID();
        UUID property = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at) VALUES (?,'Catalog HTTP',?,'ACTIVE',now(),now())", org, "ORG-" + org);
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,'HTTP','Catalog HTTP','UTC','GTQ','ACTIVE',now(),now())", property, org);
        var staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "http-catalog", "GERENCIA");
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
        var access = new StaffAuthorizationSnapshot.PropertyAccess(property, "HTTP", "Catalog HTTP", "UTC", "GTQ");
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(org, "GERENCIA", Set.of("COMMERCIAL_MANAGE"), List.of(access)));
        String token = jwt.issue(staff, Instant.now());
        String path = "/api/v1/properties/" + property + "/room-types";
        var created = request("POST", path, token, "{\"code\":\"SUITE\",\"name\":\"Suite\"}");
        assertEquals(201, created.statusCode());
        var first = json.readTree(created.body());
        UUID id = UUID.fromString(first.get("id").asText());
        var read = request("GET", path + "/" + id, token, null);
        assertEquals(200, read.statusCode());
        assertEquals(first, json.readTree(read.body()));
        var edit = request("PATCH", path + "/" + id, token, "{\"name\":\"North Suite\"}");
        assertEquals(200, edit.statusCode());
        var replay = request("PATCH", path + "/" + id, token, "{\"name\":\"North Suite\"}");
        assertEquals(200, replay.statusCode());
        assertEquals(json.readTree(edit.body()), json.readTree(replay.body()));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE entity_type='ROOM_TYPE' AND entity_id=?", Integer.class, id));
        String guest = guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), "guest@example.test"), Instant.now());
        assertEquals(401, request("GET", path, guest, null).statusCode());
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(org, "RECEPCION", Set.of(), List.of(access)));
        assertEquals(403, request("PATCH", path + "/" + id, token, "{\"name\":\"Denied\"}").statusCode());
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenThrow(new StaffAuthenticationException());
        assertEquals(401, request("GET", path, token, null).statusCode());
    }

    private HttpResponse<String> request(String method, String path, String token, String body) throws Exception {
        var uri = URI.create("http://127.0.0.1:" + environment.getRequiredProperty("local.server.port", Integer.class) + path);
        var request = HttpRequest.newBuilder(uri).header("Authorization", "Bearer " + token).header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        try (var client = HttpClient.newHttpClient()) { return client.send(request.build(), HttpResponse.BodyHandlers.ofString()); }
    }
}
