package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.*;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
@Transactional
class RatePlanApiIntegrationTests {
    private static final UUID ORG = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private final StaffPrincipal staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "rates-test", "GERENCIA");
    @Autowired MockMvc mvc;
    @Autowired StaffJwtService jwt;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired AuditService audit;
    @Autowired AvailabilityService availability;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;
    private String bearer;
    private String base;
    private UUID type;

    @BeforeEach
    void setup() {
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
        grant(Set.of("COMMERCIAL_MANAGE"), List.of(PROPERTY));
        bearer = "Bearer " + jwt.issue(staff, Instant.now());
        base = "/api/v1/properties/" + PROPERTY + "/rate-plans";
        type = insertType(PROPERTY);
    }

    @Test
    void persistsExactPriceAndAuditsChangesWithoutChangingInventory() throws Exception {
        var dates = new StayDateRange(LocalDate.of(2035, 1, 1), LocalDate.of(2035, 1, 3));
        assertEquals(0, availability.calculateATS(PROPERTY, type, dates));
        var response = mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body(type, "BAR", "125.50", "GTQ")))
                .andExpect(status().isCreated()).andExpect(jsonPath("basePrice.amount").value("125.50")).andReturn().getResponse();
        UUID id = UUID.fromString(json.readTree(response.getContentAsString()).get("id").asText());
        assertEquals(base + "/" + id, response.getHeader("Location"));
        assertEquals(12550L, jdbc.queryForObject("SELECT base_amount_minor FROM rate_plans WHERE id=?", Long.class, id));
        assertEquals(0, availability.calculateATS(PROPERTY, type, dates));
        var edit = mvc.perform(patch(base + "/" + id).header("Authorization", bearer).contentType("application/json")
                .content("{\"name\":\"Flexible\",\"basePrice\":{\"amount\":\"99.99\",\"currency\":\"USD\"}}"))
                .andExpect(status().isOk()).andExpect(jsonPath("roomTypeId").value(type.toString())).andReturn().getResponse().getContentAsString();
        var replay = mvc.perform(patch(base + "/" + id).header("Authorization", bearer).contentType("application/json")
                .content("{\"name\":\"Flexible\",\"basePrice\":{\"amount\":\"99.99\",\"currency\":\"USD\"}}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(edit, replay);
        var events = audit.findByEntity("RATE_PLAN", id);
        assertEquals(2, events.size());
        assertEquals(staff.staffUserId(), events.getFirst().actorId());
        assertEquals(PROPERTY, events.getFirst().propertyId());
        var update = events.stream().filter(e -> e.action().equals("RATE_PLAN_UPDATED")).findFirst().orElseThrow();
        assertEquals("125.50", json.readTree(update.beforeState()).get("basePrice").get("amount").asText());
        assertEquals("USD", json.readTree(update.afterState()).get("basePrice").get("currency").asText());
        assertEquals(9999L, jdbc.queryForObject("SELECT base_amount_minor FROM rate_plans WHERE id=?", Long.class, id));
        assertEquals(0, availability.calculateATS(PROPERTY, type, dates));
        mvc.perform(get(base + "/" + id).header("Authorization", bearer)).andExpect(status().isOk()).andExpect(jsonPath("basePrice.currency").value("USD"));
    }

    @Test
    void respectsIsoMinorUnitsIncludingThreeDecimalsAndZero() throws Exception {
        for (var example : List.of(new String[]{"1.234", "BHD", "1234"}, new String[]{"1", "JPY", "1"}, new String[]{"0.00", "GTQ", "0"})) {
            var response = mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body(type, "ISO-" + example[1], example[0], example[1])))
                    .andExpect(status().isCreated()).andReturn().getResponse();
            UUID id = UUID.fromString(json.readTree(response.getContentAsString()).get("id").asText());
            assertEquals(Long.parseLong(example[2]), jdbc.queryForObject("SELECT base_amount_minor FROM rate_plans WHERE id=?", Long.class, id));
        }
    }

    @Test
    void rejectsRoundingOverflowNegativeAndInvalidMoneyOrFields() throws Exception {
        for (var price : List.of(new String[]{"0.001", "GTQ"}, new String[]{"-1.00", "GTQ"},
                new String[]{"92233720368547758.08", "GTQ"}, new String[]{"1.00", "ZZZ"}, new String[]{"1.00", "XXX"},
                new String[]{"NaN", "GTQ"}, new String[]{"1e9", "GTQ"})) {
            mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body(type, "BAD", price[0], price[1])))
                    .andExpect(status().isBadRequest());
        }
        for (String payload : List.of("{}", "{\"basePrice\":null}", "{\"basePrice\":{}}", "{\"basePrice\":{\"amount\":125.50,\"currency\":\"GTQ\"}}",
                "{\"basePrice\":{\"amount\":\"1.00\",\"currency\":\"GTQ\",\"tax\":0}}", "{\"roomTypeId\":\"" + type + "\"}", "{\"name\":null}")) {
            mvc.perform(patch(base + "/" + UUID.randomUUID()).header("Authorization", bearer).contentType("application/json").content(payload)).andExpect(status().isBadRequest());
        }
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM rate_plans WHERE room_type_id=?", Integer.class, type));
    }

    @Test
    void allowsSameCodeInDifferentTypesButRejectsDuplicateInSameType() throws Exception {
        UUID otherType = insertType(PROPERTY);
        for (UUID id : List.of(type, otherType)) {
            mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body(id, "SAME", "10.00", "GTQ")))
                    .andExpect(status().isCreated());
        }
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body(type, "SAME", "10.00", "GTQ")))
                .andExpect(status().isConflict());
    }

    @Test
    void scopesTypeAndPlanAndDeniesWritesWithoutPermission() throws Exception {
        UUID other = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,'Other','UTC','GTQ','ACTIVE',now(),now())", other, ORG, "P-" + other);
        UUID foreignType = insertType(other);
        UUID foreignPlan = UUID.randomUUID();
        jdbc.update("INSERT INTO rate_plans(id,property_id,room_type_id,code,name,base_amount_minor,currency,created_at,updated_at) VALUES (?,?,?,'OTHER','Other',1000,'GTQ',now(),now())", foreignPlan, other, foreignType);
        mvc.perform(get(base + "/" + foreignPlan).header("Authorization", bearer)).andExpect(status().isNotFound());
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body(foreignType, "BAD", "10.00", "GTQ"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/properties/" + other + "/rate-plans").header("Authorization", bearer)).andExpect(status().isForbidden());
        grant(Set.of(), List.of(PROPERTY));
        mvc.perform(get(base).header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body(type, "DENIED", "10.00", "GTQ"))).andExpect(status().isForbidden());
        mvc.perform(get(base)).andExpect(status().isUnauthorized());
    }

    @Test
    void documentsMoneyAsTextAndTypedResponses() throws Exception {
        var doc = json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var operation = doc.get("paths").get("/api/v1/properties/{propertyId}/rate-plans").get("post");
        assertTrue(operation.get("security").get(0).has("bearerAuth"));
        assertEquals("#/components/schemas/RatePlanView", operation.get("responses").get("201").get("content").get("application/json").get("schema").get("$ref").asText());
        assertEquals("string", doc.get("components").get("schemas").get("CatalogPriceRequest").get("properties").get("amount").get("type").asText());
    }

    private UUID insertType(UUID property) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name,created_at,updated_at) VALUES (?,?,?,'Fixture',now(),now())", id, property, "RT-" + id);
        return id;
    }
    private String body(UUID roomType, String code, String amount, String currency) {
        return "{\"roomTypeId\":\"" + roomType + "\",\"code\":\"" + code + "\",\"name\":\"Tariff\",\"basePrice\":{\"amount\":\"" + amount + "\",\"currency\":\"" + currency + "\"}}";
    }
    private void grant(Set<String> permissions, List<UUID> ids) {
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(ORG, "GERENCIA", permissions,
                ids.stream().map(id -> new StaffAuthorizationSnapshot.PropertyAccess(id, "FIXTURE", "Hotel", "UTC", "GTQ")).toList()));
    }
}
