package com.pms.hotelboutique.backend.modules.operations.api;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

record CurrentMaintenanceFilters(UUID propertyId) {
    static CurrentMaintenanceFilters parse(HttpServletRequest request) {
        Map<String, String[]> parameters = request.getParameterMap();
        if (!Set.of("propertyId", "scope").containsAll(parameters.keySet())
                || parameters.containsKey("propertyId") == parameters.containsKey("scope")) {
            throw new IllegalArgumentException("Invalid report filters");
        }
        if (parameters.containsKey("scope")) {
            if (!"ALL_PROPERTIES".equals(required(parameters, "scope"))) {
                throw new IllegalArgumentException("Invalid report scope");
            }
            return new CurrentMaintenanceFilters(null);
        }
        String id = required(parameters, "propertyId");
        if (!id.matches("[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}")) {
            throw new IllegalArgumentException("Invalid propertyId");
        }
        return new CurrentMaintenanceFilters(UUID.fromString(id));
    }

    private static String required(Map<String, String[]> parameters, String name) {
        String[] values = parameters.get(name);
        if (values == null || values.length != 1 || values[0].isBlank()) {
            throw new IllegalArgumentException("Missing or repeated filter");
        }
        return values[0];
    }
}
