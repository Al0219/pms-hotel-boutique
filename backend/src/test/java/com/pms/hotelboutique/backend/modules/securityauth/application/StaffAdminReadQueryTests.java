package com.pms.hotelboutique.backend.modules.securityauth.application;

import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class StaffAdminReadQueryTests {
    @Test void validatesDefaultsAndNormalizesLiteralSearch() {
        var query = StaffAdminReadQuery.parse(Map.of("scope", List.of("ALL_PROPERTIES"), "username", List.of("  A%_!\\  ")), false);
        assertEquals(50, query.limit()); assertEquals("A%_!\\", query.username());
        assertNull(query.status()); assertNull(query.roleCode());
        String id = UUID.randomUUID().toString().toUpperCase(Locale.ROOT);
        assertEquals(UUID.fromString(id), StaffAdminReadQuery.parse(Map.of("scope", List.of("PROPERTY"), "propertyId", List.of(id)), true).propertyId());
    }
    @Test void rejectsUnknownDuplicateAndInvalidValuesWithoutClamping() {
        for (var entry : Map.of("limit", List.of("0", "101", "1.5", "-1", ""), "status", List.of("UNKNOWN", "active"),
                "roleCode", List.of("guest", ""), "username", List.of(" ", "x\ny", "x".repeat(81)),
                "cursor", List.of("", "x".repeat(4097)), "organizationId", List.of(UUID.randomUUID().toString())).entrySet()) {
            for (var value : entry.getValue()) {
                var params = new HashMap<String, List<String>>(); params.put("scope", List.of("ALL_PROPERTIES")); params.put(entry.getKey(), List.of(value));
                assertThrows(StaffAdminReadException.class, () -> StaffAdminReadQuery.parse(params, false), entry.getKey());
            }
        }
        for (var params : List.of(Map.<String,List<String>>of(), Map.of("scope", List.of("PROPERTY")),
                Map.of("scope", List.of("ALL_PROPERTIES", "PROPERTY")),
                Map.of("scope", List.of("ALL_PROPERTIES"), "propertyId", List.of(UUID.randomUUID().toString()))))
            assertThrows(StaffAdminReadException.class, () -> StaffAdminReadQuery.parse(params, false));
        assertThrows(StaffAdminReadException.class, () -> StaffAdminReadQuery.parse(Map.of("scope", List.of("ALL_PROPERTIES"), "limit", List.of("1")), true));
        assertThrows(StaffAdminReadException.class, () -> StaffAdminReadQuery.uuid("1-1-1-1-1"));
    }
}
