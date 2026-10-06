package com.pms.hotelboutique.backend.infrastructure.openapi;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.Map;
import java.util.List;
import java.util.HashSet;
import org.springframework.core.annotation.AnnotatedElementUtils;
import tools.jackson.databind.JsonNode;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OpenApiContractIntegrationTests {
    // Add only exclusions justified in docs/39_BACKEND_OPENAPI_BASELINE.md.
    private static final Map<String, String> DOCUMENTED_EXCLUSIONS = Map.of();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping mappings;

    @Test
    void generatedPathsAndMethodsMatchRealApplicationMappings() throws Exception {
        String raw = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var doc = json.readTree(raw);
        Set<String> expected = new TreeSet<>();
        mappings.getHandlerMethods().forEach((mapping, handler) -> {
            if (!handler.getBeanType().getPackageName().startsWith("com.pms.hotelboutique.backend.modules")
                    || !AnnotatedElementUtils.hasAnnotation(handler.getBeanType(), RestController.class)) return;
            for (String path : mapping.getPatternValues()) {
                for (var method : mapping.getMethodsCondition().getMethods()) expected.add(method.name() + " " + path);
            }
        });
        Set<String> actual = new TreeSet<>();
        doc.path("paths").properties().forEach(entry -> entry.getValue().properties().forEach(operation -> {
            if (Set.of("get", "post", "put", "patch", "delete", "head", "options", "trace").contains(operation.getKey())) {
                actual.add(operation.getKey().toUpperCase() + " " + entry.getKey());
            }
        }));
        Files.createDirectories(Path.of("target"));
        Files.writeString(Path.of("target/openapi-generated.json"), raw);
        Files.write(Path.of("target/openapi-application-mappings.txt"), expected);
        DOCUMENTED_EXCLUSIONS.values().forEach(reason -> assertFalse(reason.isBlank()));
        assertTrue(expected.containsAll(DOCUMENTED_EXCLUSIONS.keySet()));
        expected.removeAll(DOCUMENTED_EXCLUSIONS.keySet());
        assertEquals(expected, actual);
        assertEquals(29, actual.size());
    }
    @Test
    void securitySchemesAndEveryOperationAudienceMatchTheActualTransport() throws Exception {
        var doc = document();
        var schemes = doc.path("components").path("securitySchemes");
        for (String name : List.of("bearerAuth", "guestBearerAuth")) {
            assertEquals("http", schemes.path(name).path("type").asText());
            assertEquals("bearer", schemes.path(name).path("scheme").asText());
            assertEquals("JWT", schemes.path(name).path("bearerFormat").asText());
        }
        for (var entry : Map.of("staffRefreshCookie", "pms_staff_refresh", "guestRefreshCookie", "pms_guest_refresh").entrySet()) {
            assertEquals("apiKey", schemes.path(entry.getKey()).path("type").asText());
            assertEquals("cookie", schemes.path(entry.getKey()).path("in").asText());
            assertEquals(entry.getValue(), schemes.path(entry.getKey()).path("name").asText());
        }
        doc.path("paths").properties().forEach(path -> path.getValue().properties().forEach(method -> {
            String route = path.getKey();
            var op = method.getValue();
            boolean staffAuth = route.startsWith("/api/v1/staff-auth/");
            boolean guestAuth = route.startsWith("/api/v1/guest-auth/");
            assertEquals(staffAuth || guestAuth ? "internal-bff" : "staff", op.path("x-audience").asText());
            boolean anonymous = route.endsWith("/google/start") || route.endsWith("/google/exchange")
                    || route.equals("/api/v1/staff-auth/sessions");
            if (anonymous) assertTrue(op.path("security").isMissingNode() || op.path("security").isEmpty());
            else {
                String scheme = route.endsWith("/refresh") ? (staffAuth ? "staffRefreshCookie" : "guestRefreshCookie")
                        : guestAuth ? "guestBearerAuth" : "bearerAuth";
                assertEquals(1, op.path("security").size());
                assertTrue(op.path("security").get(0).has(scheme), route + " " + method.getKey());
            }
            assertFalse(route.startsWith("/actuator") || route.equals("/error"));
        }));
    }

    @Test
    void successAndContractualErrorsHaveCorrectCodesAndBodies() throws Exception {
        var doc = document();
        for (String prefix : List.of("/api/v1/staff-auth", "/api/v1/guest-auth")) {
            String create = prefix.endsWith("staff-auth") ? prefix + "/sessions" : prefix + "/google/exchange";
            assertCodes(operation(doc, create, "post"), "201", "400", "401");
            assertSuccessSchema(operation(doc, create, "post"), "201",
                    prefix.endsWith("staff-auth") ? "StaffAuthResponse" : "GuestAuthResponse");
            assertCodes(operation(doc, prefix + "/refresh", "post"), "200", "401");
            assertCodes(operation(doc, prefix + "/session", "get"), "200", "401");
            var logout = operation(doc, prefix + "/session", "delete");
            assertCodes(logout, "204", "401");
            assertTrue(logout.path("responses").path("204").path("content").isMissingNode()
                    || logout.path("responses").path("204").path("content").isEmpty());
        }
        var issue = operation(doc, "/api/v1/guest-auth/reservation-links/challenges", "post");
        assertCodes(issue, "202", "400", "401");
        assertSuccessSchema(issue, "202", "ChallengeResponse");
        var verify = operation(doc, "/api/v1/guest-auth/reservation-links/verify", "post");
        assertCodes(verify, "204", "400", "401", "422");
        assertEquals("#/components/schemas/ProblemDetail",
                verify.path("responses").path("422").path("content").path("application/problem+json").path("schema").path("$ref").asText());
        var report = operation(doc, "/api/v1/reports/on-books/daily", "get");
        assertCodes(report, "200", "400", "401", "403");
        assertSuccessSchema(report, "200", "DailyOnBooksResponse");
        assertTrue(report.path("responses").path("200").path("headers").has("Cache-Control"));
        assertCodes(operation(doc, "/api/v1/properties/{propertyId}/availability", "get"), "200", "400", "401", "403", "404");
        for (var entry : Map.of("/api/v1/properties", "PropertyView",
                "/api/v1/properties/{propertyId}/room-types", "RoomTypeView",
                "/api/v1/properties/{propertyId}/rooms", "RoomView",
                "/api/v1/properties/{propertyId}/rate-plans", "RatePlanView").entrySet()) {
            var create = operation(doc, entry.getKey(), "post");
            assertSuccessSchema(create, "201", entry.getValue());
            for (String code : List.of("400", "401", "403", "409")) assertTrue(create.path("responses").has(code));
            assertTrue(create.path("responses").path("200").isMissingNode());
            assertEquals("uri-reference", create.path("responses").path("201").path("headers").path("Location").path("schema").path("format").asText());
            var list = operation(doc, entry.getKey(), "get");
            assertEquals("#/components/schemas/" + entry.getValue(),
                    list.path("responses").path("200").path("content").path("application/json").path("schema").path("items").path("$ref").asText());
        }
    }

    @Test
    void pathQueryParametersAndJsonBodiesAreExplicitWithoutServerPrincipals() throws Exception {
        var doc = document();
        doc.path("paths").properties().forEach(path -> path.getValue().properties().forEach(method -> {
            var op = method.getValue();
            assertFalse(op.path("summary").asText().isBlank());
            var names = new HashSet<String>();
            for (var parameter : op.path("parameters")) {
                String name = parameter.path("name").asText();
                assertTrue(names.add(parameter.path("in").asText() + ":" + name), "duplicate parameter");
                assertFalse(Set.of("principal", "staffUserId", "sessionId", "username", "roleCode").contains(name), name);
                if (parameter.path("in").asText().equals("path")) {
                    assertTrue(parameter.path("required").asBoolean());
                    assertEquals("uuid", parameter.path("schema").path("format").asText());
                    assertTrue(path.getKey().contains("{" + name + "}"));
                }
            }
            if (op.has("requestBody")) {
                assertTrue(op.path("requestBody").path("required").asBoolean());
                assertTrue(op.path("requestBody").path("content").has("application/json"));
            }
        }));
        var report = operation(doc, "/api/v1/reports/on-books/daily", "get");
        assertEquals(Set.of("from", "to", "propertyId", "scope"), parameterNames(report));
        for (String name : List.of("from", "to")) {
            var parameter = parameter(report, name);
            assertTrue(parameter.path("required").asBoolean());
            assertEquals("date", parameter.path("schema").path("format").asText());
        }
        assertEquals("uuid", parameter(report, "propertyId").path("schema").path("format").asText());
        assertEquals("ALL_PROPERTIES", parameter(report, "scope").path("schema").path("enum").get(0).asText());
        assertTrue(report.path("description").asText().contains("366"));
        assertTrue(report.path("description").asText().contains("50000"));
        assertFalse(parameterNames(report).contains("cursor"));
        var available = operation(doc, "/api/v1/properties/{propertyId}/availability", "get");
        assertEquals(Set.of("propertyId", "roomTypeId", "arrival", "departure"), parameterNames(available));
        assertEquals("date", parameter(available, "arrival").path("schema").path("format").asText());
        assertEquals("date", parameter(available, "departure").path("schema").path("format").asText());
    }

    @Test
    void dtoValidationNullabilityAndPrivacyAreFaithfulToWireContracts() throws Exception {
        var doc = document();
        var schemas = doc.path("components").path("schemas");
        assertFalse(schemas.has("StaffPrincipal") || schemas.has("GuestPrincipal") || schemas.has("StaffUser"));
        var login = schemas.path("StaffLoginRequest");
        assertEquals(Set.of("username", "password"), strings(login.path("required")));
        var password = login.path("properties").path("password");
        assertTrue(password.path("writeOnly").asBoolean());
        assertEquals("password", password.path("format").asText());
        assertEquals(256, password.path("maxLength").asInt());
        assertEquals(1, password.path("minLength").asInt());
        for (String name : List.of("StaffAuthResponse", "GuestAuthResponse")) {
            var tokens = schemas.path(name);
            assertEquals(Set.of("accessToken", "refreshToken", "accessTokenExpiresInSeconds"), strings(tokens.path("required")));
            for (String field : List.of("accessToken", "refreshToken")) assertNoExamples(tokens.path("properties").path(field));
        }
        for (String name : List.of("PatchPropertyRequest", "PatchRoomTypeRequest", "PatchRatePlanRequest")) {
            var patch = schemas.path(name);
            assertFalse(patch.path("additionalProperties").asBoolean(true));
            assertEquals(1, patch.path("minProperties").asInt());
            assertTrue(patch.path("required").isMissingNode() || patch.path("required").isEmpty());
            assertEquals("[\\s\\S]*\\S[\\s\\S]*", patch.path("properties").path("code").path("pattern").asText());
            assertEquals("string", patch.path("properties").path("code").path("type").asText());
        }
        var night = schemas.path("Night");
        assertEquals(Set.of("number", "null"), strings(night.path("properties").path("onBooksPercent").path("type")));
        assertTrue(night.path("properties").path("onBooksPercent").path("maximum").isMissingNode());
        assertEquals(Set.of("string", "null"), strings(night.path("properties").path("unavailableReason").path("type")));
        var reasons = night.path("properties").path("unavailableReason").path("enum");
        assertTrue(strings(reasons).contains("NO_AVAILABLE_ROOMS"));
        boolean acceptsNull = false;
        for (var reason : reasons) acceptsNull |= reason.isNull();
        assertTrue(acceptsNull, "nullable enum must also accept JSON null");
        assertEquals(50000, schemas.path("DailyOnBooksResponse").path("properties").path("rows").path("maxItems").asInt());
        assertEquals("string", schemas.path("CatalogPriceRequest").path("properties").path("amount").path("type").asText());
        var otp = schemas.path("VerifyRequest").path("properties").path("otp");
        assertEquals("[0-9]{8}", otp.path("pattern").asText());
        assertTrue(otp.path("writeOnly").asBoolean());
        assertNoExamples(otp);
        assertNoExamples(password);
        assertNoExamples(schemas.path("GoogleExchangeRequest").path("properties").path("code"));
        assertNoExamples(schemas.path("GoogleExchangeRequest").path("properties").path("state"));
        assertNoExamples(schemas.path("GuestSessionResponse").path("properties").path("email"));
    }

    @Test
    void catalogCrudSchemasErrorsAndScopeRemainDocumented() throws Exception {
        var doc = document();
        var schemas = doc.path("components").path("schemas");
        for (String catalog : List.of("Property", "RoomType", "Room", "RatePlan")) {
            String collection = switch (catalog) {
                case "Property" -> "/api/v1/properties";
                case "RoomType" -> "/api/v1/properties/{propertyId}/room-types";
                case "Room" -> "/api/v1/properties/{propertyId}/rooms";
                default -> "/api/v1/properties/{propertyId}/rate-plans";
            };
            String id = Character.toLowerCase(catalog.charAt(0)) + catalog.substring(1) + "Id";
            String detail = collection + "/{" + id + "}";
            assertCodes(operation(doc, detail, "get"), "200", "400", "401", "403", "404");
            var patch = operation(doc, detail, "patch");
            assertCodes(patch, "200", "400", "401", "403", "404", "409");
            assertSuccessSchema(patch, "200", catalog + "View");
            assertTrue(patch.path("description").asText().contains("COMMERCIAL_MANAGE"));
            for (String prefix : List.of("Create", "Patch")) {
                String request = prefix + catalog + "Request";
                var op = prefix.equals("Create") ? operation(doc, collection, "post") : patch;
                assertEquals("#/components/schemas/" + request,
                        op.path("requestBody").path("content").path("application/json").path("schema").path("$ref").asText());
                assertFalse(schemas.path(request).path("additionalProperties").asBoolean(true));
            }
            var view = schemas.path(catalog + "View");
            var fields = new TreeSet<String>();
            view.path("properties").properties().forEach(entry -> fields.add(entry.getKey()));
            assertEquals(fields, strings(view.path("required")), catalog + " output fields");
            assertTrue(doc.path("paths").path(detail).path("delete").isMissingNode());
        }
        assertTrue(operation(doc, "/api/v1/properties", "get").path("description").asText().contains("MULTI_PROPERTY_READ"));
        var available = operation(doc, "/api/v1/properties/{propertyId}/availability", "get").path("description").asText();
        assertTrue(available.contains("RESERVATION_MANAGE") && available.contains("COMMERCIAL_MANAGE"));
    }

    @Test
    void allLocalSchemaReferencesResolve() throws Exception {
        var doc = document();
        checkReferences(doc, doc);
    }

    @Test
    void schemaAnnotationsDoNotAlterHttpAuthenticationOrValidation() throws Exception {
        mvc.perform(post("/api/v1/staff-auth/sessions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"\",\"password\":\"\"}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/staff-auth/refresh")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/guest-auth/refresh")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/staff-auth/session")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/guest-auth/session")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/reports/on-books/daily")).andExpect(status().isUnauthorized());
    }

    private JsonNode document() throws Exception {
        return json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private JsonNode operation(JsonNode doc, String path, String method) {
        var result = doc.path("paths").path(path).path(method);
        assertFalse(result.isMissingNode(), method + " " + path);
        return result;
    }

    private void assertCodes(JsonNode op, String... codes) {
        var actual = new TreeSet<String>();
        op.path("responses").properties().forEach(entry -> actual.add(entry.getKey()));
        assertEquals(Set.of(codes), actual);
    }

    private void assertSuccessSchema(JsonNode op, String code, String name) {
        assertEquals("#/components/schemas/" + name,
                op.path("responses").path(code).path("content").path("application/json").path("schema").path("$ref").asText());
    }

    private Set<String> strings(JsonNode array) {
        var result = new TreeSet<String>();
        for (var value : array) if (!value.isNull()) result.add(value.asText());
        return result;
    }

    private Set<String> parameterNames(JsonNode op) {
        var result = new TreeSet<String>();
        for (var parameter : op.path("parameters")) result.add(parameter.path("name").asText());
        return result;
    }

    private JsonNode parameter(JsonNode op, String name) {
        for (var parameter : op.path("parameters")) if (parameter.path("name").asText().equals(name)) return parameter;
        fail("parameter missing: " + name);
        return null;
    }

    private void assertNoExamples(JsonNode schema) {
        for (String name : List.of("example", "examples", "default")) assertFalse(schema.has(name), name);
    }

    private void checkReferences(JsonNode node, JsonNode root) {
        if (node.isObject()) {
            if (node.has("$ref")) {
                String reference = node.path("$ref").asText();
                assertTrue(reference.startsWith("#/components/schemas/"), reference);
                assertFalse(root.at(reference.substring(1)).isMissingNode(), reference);
            }
            node.properties().forEach(entry -> checkReferences(entry.getValue(), root));
        } else if (node.isArray()) for (var value : node) checkReferences(value, root);
    }

}
