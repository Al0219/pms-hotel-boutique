package com.pms.hotelboutique.backend.modules.securityauth.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Explicit administrative projections. Never serialize StaffUser or session entities. */
public final class StaffAdminReadModels {
    private StaffAdminReadModels() { }
    public enum RoleCode { SUPER_ADMIN, GERENCIA, RECEPCION, OPERACIONES, AUDITOR }
    public enum UserStatus { ACTIVE, SUSPENDED, DISABLED }
    public enum MembershipStatus { ACTIVE, INACTIVE }
    public enum ScopeKind { PROPERTY, ALL_PROPERTIES }

    @Schema(name = "StaffAdminScope")
    public record Scope(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) ScopeKind kind,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<UUID> propertyIds) {
        public Scope { propertyIds = List.copyOf(propertyIds); }
    }
    @Schema(name = "StaffAdminRole")
    public record Role(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) RoleCode code,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 120) String name) { }
    @Schema(name = "StaffAdminRolesResponse")
    public record Roles(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID organizationId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<Role> items) { }
    @Schema(name = "StaffAdminUserView")
    public record User(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 80) String username,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1, maxLength = 320) String workEmail,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UserStatus status,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) RoleCode roleCode,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) MembershipStatus membershipStatus,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID organizationId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<UUID> propertyIds,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", maximum = "9007199254740991") long version) {
        public User { propertyIds = List.copyOf(propertyIds); }
    }
    @Schema(name = "StaffAdminUsersPage")
    public record Page(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID organizationId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Scope scope,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<User> items,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "1", maximum = "100") int limit,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, types = {"string", "null"}, maxLength = 4096) String nextCursor) { }
    @Schema(name = "StaffAdminUserDetail")
    public record Detail(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID organizationId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Scope scope,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) User item) { }
    @Schema(name = "StaffAdminReadError")
    public record Error(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = "about:blank") String type,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int status,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) StaffAdminReadException.Failure code) {
        public static Error of(StaffAdminReadException.Failure failure) {
            return new Error("about:blank", failure.title, failure.status, failure);
        }
    }
}
