package com.pms.hotelboutique.backend.modules.securityauth.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.*;

public final class StaffAdminMutationModels {
    private StaffAdminMutationModels() { }
    public enum Kind { CONTACT, MEMBERSHIP, STATUS }
    public enum AssignedRole { GERENCIA, RECEPCION, OPERACIONES, AUDITOR }
    public enum RequestedStatus { SUSPENDED, DISABLED }
    @Schema(name="StaffAdminContactCommand",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Contact(@Schema(requiredMode=Schema.RequiredMode.REQUIRED,maxLength=50,format="email") String workEmail,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED,minimum="0",maximum="9007199254740990") long expectedVersion) { }
    @Schema(name="StaffAdminMembershipCommand",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Membership(@Schema(requiredMode=Schema.RequiredMode.REQUIRED) AssignedRole roleCode,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<UUID> propertyIds,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED,minimum="0",maximum="9007199254740990") long expectedVersion) { }
    @Schema(name="StaffAdminStatusCommand",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Status(@Schema(requiredMode=Schema.RequiredMode.REQUIRED) RequestedStatus status,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED,minimum="0",maximum="9007199254740990") long expectedVersion) { }
    @Schema(name="StaffAdminMutationResult")
    public record Result(@Schema(requiredMode=Schema.RequiredMode.REQUIRED) UUID organizationId,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) UUID staffUserId,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED,minimum="0",maximum="9007199254740991") long version,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) boolean changed) { }
    @Schema(name="StaffAdminMutationError")
    public record Error(@Schema(requiredMode=Schema.RequiredMode.REQUIRED) String type,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String title,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) int status,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String code) { }
    // Internal validated command, never serialized or logged (including workEmail).
    public static final class Command {
        public final long version; public final String email,role,status; public final Set<UUID> properties;
        public Command(long version,String email,String role,String status,Set<UUID> properties) {
            this.version=version;this.email=email;this.role=role;this.status=status;this.properties=Set.copyOf(properties);
        }
        @Override public String toString(){return "StaffAdminCommand[redacted]";}
    }
}
