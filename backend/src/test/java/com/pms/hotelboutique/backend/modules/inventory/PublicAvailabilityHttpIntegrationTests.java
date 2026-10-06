package com.pms.hotelboutique.backend.modules.inventory;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PublicAvailabilityHttpIntegrationTests {
    private static final String PATH = "/api/v1/public/availability";
    private final UUID property = id("property");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @BeforeEach
    void fixtures() {
        UUID organization = jdbc.queryForObject("SELECT id FROM organizations WHERE code='HOTEL_BOUTIQUE'", UUID.class);
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,'A3-PUBLIC','A3 property','America/Guatemala','GTQ','ACTIVE',now(),now())", property, organization);
    }

    @Test
    void anonymousRequestReturnsOnlyApprovedFieldsWithRealIdentityAndPrices() throws Exception {
        UUID std = type("STD", 2);
        UUID dlx = type("DLX", 2);
        UUID suite = type("SUITE", 2);
        var response = mvc.perform(request(parameters())).andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON)).andReturn().getResponse();
        var result = json.readTree(response.getContentAsString());
        assertEquals(Set.of("propertyId", "arrival", "departure", "currency", "offers"), fields(result));
        assertEquals(property.toString(), result.path("propertyId").asText());
        assertEquals("2026-11-01", result.path("arrival").asText());
        assertEquals("2026-11-03", result.path("departure").asText());
        assertEquals("GTQ", result.path("currency").asText());
        assertEquals(3, result.path("offers").size());
        var expected = Map.of("STD", std, "DLX", dlx, "SUITE", suite);
        var amounts = Map.of("STD", 65000L, "DLX", 85000L, "SUITE", 120000L);
        var plans = Map.of("STD", "DEMO_STANDARD", "DLX", "DEMO_DELUXE", "SUITE", "DEMO_SUITE");
        for (var offer : result.path("offers")) {
            assertEquals(Set.of("roomTypeId", "roomTypeCode", "roomTypeName", "ratePlanId", "ratePlanCode",
                    "availableUnits", "nightlyRateMinor", "totalMinor"), fields(offer));
            String code = offer.path("roomTypeCode").asText();
            assertEquals(expected.get(code).toString(), offer.path("roomTypeId").asText());
            assertEquals("Real " + code, offer.path("roomTypeName").asText());
            assertEquals(plans.get(code), offer.path("ratePlanId").asText());
            assertEquals(plans.get(code), offer.path("ratePlanCode").asText());
            assertEquals(2, offer.path("availableUnits").asInt());
            assertEquals(amounts.get(code).longValue(), offer.path("nightlyRateMinor").asLong());
            assertEquals(2 * amounts.get(code), offer.path("totalMinor").asLong());
        }
        assertEquals(0, response.getCookies().length);
    }

    @Test
    void zeroAvailabilityIs200WithEmptyOffers() throws Exception {
        type("STD", 0);
        mvc.perform(request(parameters())).andExpect(status().isOk()).andExpect(jsonPath("$.offers").isEmpty());
    }

    @Test
    void emptyCatalogIs200WithEmptyOffers() throws Exception {
        mvc.perform(request(parameters())).andExpect(status().isOk()).andExpect(jsonPath("$.offers").isEmpty());
    }

    @Test
    void missingPropertyIs404() throws Exception {
        var params = parameters();
        params.put("propertyId", id("missing").toString());
        mvc.perform(request(params)).andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void inactivePropertyIs404BeforePricingOrCatalogExposure() throws Exception {
        type("UNCONFIGURED", 1);
        jdbc.update("UPDATE properties SET status='INACTIVE',currency='USD' WHERE id=?", property);
        mvc.perform(request(parameters())).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Property unavailable"));
    }

    @ParameterizedTest
    @CsvSource({"arrival,2026-11-03", "arrival,2026-11-04", "rooms,0", "rooms,-1",
            "propertyId,not-a-uuid", "arrival,not-a-date", "departure,not-a-date", "rooms,not-an-int"})
    void invalidQueryIs400(String name, String value) throws Exception {
        var params = parameters();
        params.put(name, value);
        mvc.perform(request(params)).andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @ParameterizedTest
    @ValueSource(strings = {"propertyId", "arrival", "departure", "rooms"})
    void missingRequiredParameterIs400(String name) throws Exception {
        var params = parameters();
        params.remove(name);
        mvc.perform(request(params)).andExpect(status().isBadRequest());
    }

    @Test
    void roomsRequestedIsNotAnAcceptedAliasForRooms() throws Exception {
        var params = parameters();
        params.remove("rooms");
        params.put("roomsRequested", "1");
        mvc.perform(request(params)).andExpect(status().isBadRequest());
    }

    @Test
    void unconfiguredRateReturnsControlled500WithoutPartialOffers() throws Exception {
        type("STD", 1);
        type("ZZZ_UNCONFIGURED", 1);
        mvc.perform(request(parameters())).andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("DEMO_RATE_NOT_CONFIGURED"))
                .andExpect(jsonPath("$.offers").doesNotExist());
    }

    @Test
    void incompatibleCurrencyReturnsControlled500() throws Exception {
        jdbc.update("UPDATE properties SET currency='USD' WHERE id=?", property);
        mvc.perform(request(parameters())).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("DEMO_CURRENCY_MISMATCH"));
    }

    @Test
    void staffNeighborsAndOtherPublicPathsRemainProtected() throws Exception {
        mvc.perform(get("/api/v1/properties/" + property + "/availability")
                .param("roomTypeId", id("STD").toString()).param("arrival", "2026-11-01")
                .param("departure", "2026-11-03")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/properties/" + property + "/room-types")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/properties")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/public/other")).andExpect(status().isUnauthorized());
        mvc.perform(post(PATH)).andExpect(status().isUnauthorized());
    }

    private Map<String, String> parameters() {
        return new LinkedHashMap<>(Map.of("propertyId", property.toString(), "arrival", "2026-11-01",
                "departure", "2026-11-03", "rooms", "1"));
    }

    private MockHttpServletRequestBuilder request(Map<String, String> params) {
        var request = get(PATH);
        params.forEach(request::param);
        return request;
    }

    private UUID type(String code, int rooms) {
        UUID type = id(code);
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,?)", type, property, code, "Real " + code);
        for (int i = 0; i < rooms; i++) {
            jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)",
                    id(code + "/" + i), property, type, code + "-" + i);
        }
        return type;
    }

    private static UUID id(String name) { return UUID.nameUUIDFromBytes(("public-a3/" + name).getBytes(StandardCharsets.UTF_8)); }

    private Set<String> fields(JsonNode object) {
        Set<String> result = new HashSet<>();
        object.properties().forEach(field -> result.add(field.getKey()));
        return result;
    }
}
