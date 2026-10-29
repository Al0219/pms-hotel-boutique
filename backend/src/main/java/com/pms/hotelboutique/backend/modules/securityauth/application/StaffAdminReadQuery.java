package com.pms.hotelboutique.backend.modules.securityauth.application;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadException.Failure.INVALID_REQUEST;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadModels.*;

/** Parsed after authentication/permission checks, including callers outside HTTP. */
public record StaffAdminReadQuery(ScopeKind scope, UUID propertyId, UserStatus status, RoleCode roleCode,
        String username, int limit, String cursor) {
    public static StaffAdminReadQuery parse(Map<String, List<String>> parameters, boolean detail) {
        Set<String> allowed = detail ? Set.of("scope", "propertyId")
                : Set.of("scope", "propertyId", "status", "roleCode", "username", "limit", "cursor");
        try {
            if (parameters.entrySet().stream().anyMatch(e -> !allowed.contains(e.getKey()) || e.getValue().size() != 1)) invalid();
            ScopeKind scope = ScopeKind.valueOf(value(parameters, "scope"));
            String rawProperty = value(parameters, "propertyId");
            if ((scope == ScopeKind.PROPERTY) != (rawProperty != null)) invalid();
            UUID property = rawProperty == null ? null : uuid(rawProperty);
            String status = value(parameters, "status"), role = value(parameters, "roleCode");
            String username = value(parameters, "username");
            if (username != null) {
                if (username.codePoints().anyMatch(Character::isISOControl)) invalid();
                username = username.trim();
                if (username.isEmpty() || username.length() > 80) invalid();
            }
            String rawLimit = value(parameters, "limit");
            if (rawLimit != null && !rawLimit.matches("[0-9]{1,3}")) invalid();
            int limit = rawLimit == null ? 50 : Integer.parseInt(rawLimit);
            if (limit < 1 || limit > 100) invalid();
            String cursor = value(parameters, "cursor");
            if (cursor != null && (cursor.isBlank() || cursor.length() > 4096)) invalid();
            return new StaffAdminReadQuery(scope, property, status == null ? null : UserStatus.valueOf(status),
                    role == null ? null : RoleCode.valueOf(role), username, limit, cursor);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new StaffAdminReadException(INVALID_REQUEST);
        }
    }
    public static UUID uuid(String value) {
        if (value == null || !value.matches("(?i)[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}")) invalid();
        return UUID.fromString(value);
    }
    private static String value(Map<String, List<String>> parameters, String name) {
        return parameters.containsKey(name) ? parameters.get(name).getFirst() : null;
    }
    private static void invalid() { throw new StaffAdminReadException(INVALID_REQUEST); }
}
