package com.pms.hotelboutique.backend.modules.inventory.api;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Shared, strict query contract for JSON and CSV. Null propertyId means explicit ALL_PROPERTIES only. */
record DailyOnBooksFilters(LocalDate from, LocalDate to, UUID propertyId) {
    static DailyOnBooksFilters parse(HttpServletRequest request) {
        var parameters = request.getParameterMap();
        if (!Set.of("from", "to", "propertyId", "scope").containsAll(parameters.keySet())
                || parameters.containsKey("propertyId") == parameters.containsKey("scope")) {
            throw new IllegalArgumentException("Invalid report filters");
        }
        LocalDate from = date(required(parameters, "from"));
        LocalDate to = date(required(parameters, "to"));
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) >= 366) {
            throw new IllegalArgumentException("Invalid report range");
        }
        UUID property = null;
        if (parameters.containsKey("propertyId")) {
            String id = required(parameters, "propertyId");
            if (!id.matches("[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}")) {
                throw new IllegalArgumentException("Invalid propertyId");
            }
            property = UUID.fromString(id);
        } else if (!"ALL_PROPERTIES".equals(required(parameters, "scope"))) {
            throw new IllegalArgumentException("Invalid report scope");
        }
        return new DailyOnBooksFilters(from, to, property);
    }

    private static String required(Map<String, String[]> parameters, String name) {
        String[] values = parameters.get(name);
        if (values == null || values.length != 1 || values[0].isBlank()) {
            throw new IllegalArgumentException("Missing or repeated filter");
        }
        return values[0];
    }

    private static LocalDate date(String value) {
        if (!value.matches("\\d{4}-\\d{2}-\\d{2}")) throw new IllegalArgumentException("Invalid stay date");
        try { return LocalDate.parse(value); }
        catch (java.time.format.DateTimeParseException exception) {
            throw new IllegalArgumentException("Invalid stay date", exception);
        }
    }
}
