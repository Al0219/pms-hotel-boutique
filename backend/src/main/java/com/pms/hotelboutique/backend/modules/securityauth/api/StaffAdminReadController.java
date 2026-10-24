package com.pms.hotelboutique.backend.modules.securityauth.api;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadModels.*;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value = "/api/v1/staff-admin", produces = "application/json")
@Tag(name = "Staff administration reads", description = "Internal BFF-only, STAFF_MANAGE; organization from active Staff membership. Read projections only.")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(responseCode = "405", description = "Unsupported administrative method; no mutation, empty body.",
        headers = {@Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
                @Header(name = "Allow", schema = @Schema(type = "string", allowableValues = "GET, HEAD"))}, content = @Content)
@ApiResponse(responseCode = "400", description = "INVALID_REQUEST or INVALID_CURSOR; rejects unknown/duplicate parameters.",
        headers = @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
        content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = StaffAdminReadModels.Error.class)))
@ApiResponse(responseCode = "401", description = "STAFF_SESSION_REQUIRED: missing/invalid/expired/revoked or Guest token.",
        headers = @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
        content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = StaffAdminReadModels.Error.class)))
@ApiResponse(responseCode = "403", description = "STAFF_ACCESS_DENIED: STAFF_MANAGE or requested property scope denied.",
        headers = @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
        content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = StaffAdminReadModels.Error.class)))
@ApiResponse(responseCode = "503", description = "STAFF_READ_UNAVAILABLE: persistence/catalog/projection unavailable; no partial success.",
        headers = @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
        content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = StaffAdminReadModels.Error.class)))
public class StaffAdminReadController {
    private final StaffAdminReadService reads;
    public StaffAdminReadController(StaffAdminReadService reads) { this.reads = reads; }

    @GetMapping("/roles")
    @Operation(summary = "Read the five fixed Staff roles", description = "STAFF_MANAGE. No query parameters; organization from Staff session. Read-only catalogue; no editable permissions.")
    @ApiResponse(responseCode = "200", description = "Fixed ACTIVE roles, in V1 order.",
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
            content = @Content(schema = @Schema(implementation = Roles.class)))
    public Roles roles(@Parameter(hidden = true) @RequestParam MultiValueMap<String, String> query) { return reads.roles(query); }

    @GetMapping("/users")
    @Operation(summary = "List visible Staff users", description = "STAFF_MANAGE, explicit C2 scope. SQL checks the target's complete active assignments against actor portfolio, not just overlap. "
            + "GERENCIA cannot see SUPER_ADMIN or unassigned users. Unassigned targets only SUPER_ADMIN ALL_PROPERTIES. "
            + "Literal username search; fixed username COLLATE C ASC,id ASC order. Cursor 15min, signed and bound to session/organization/authorization/scope/filters/limit; restart or another replica invalidates it. No total or offset.")
    @Parameters({
        @Parameter(name = "scope", in = ParameterIn.QUERY, required = true, schema = @Schema(allowableValues = {"PROPERTY", "ALL_PROPERTIES"})),
        @Parameter(name = "propertyId", in = ParameterIn.QUERY, description = "Required only for PROPERTY; forbidden for ALL_PROPERTIES.", schema = @Schema(type = "string", format = "uuid")),
        @Parameter(name = "status", in = ParameterIn.QUERY, description = "Absent includes all three states.", schema = @Schema(implementation = UserStatus.class)),
        @Parameter(name = "roleCode", in = ParameterIn.QUERY, schema = @Schema(implementation = RoleCode.class)),
        @Parameter(name = "username", in = ParameterIn.QUERY, description = "Literal case-insensitive substring; trim; no control characters. %, _ and escape are literal.", schema = @Schema(minLength = 1, maxLength = 80)),
        @Parameter(name = "limit", in = ParameterIn.QUERY, schema = @Schema(type = "integer", minimum = "1", maximum = "100", defaultValue = "50")),
        @Parameter(name = "cursor", in = ParameterIn.QUERY, schema = @Schema(minLength = 1, maxLength = 4096))
    })
    @ApiResponse(responseCode = "200", description = "Scoped page, including an empty page; nextCursor null at end.",
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
            content = @Content(schema = @Schema(implementation = Page.class)))
    public Page users(@Parameter(hidden = true) @RequestParam MultiValueMap<String, String> query) { return reads.users(query); }

    @GetMapping("/users/{id}")
    @Operation(summary = "Read one visible Staff user", description = "STAFF_MANAGE; same complete-target SQL and scope as list. Includes inactive membership assignments without granting effective access. Foreign/inaccessible and absent IDs have identical 404.")
    @Parameters({
        @Parameter(name = "scope", in = ParameterIn.QUERY, required = true, schema = @Schema(allowableValues = {"PROPERTY", "ALL_PROPERTIES"})),
        @Parameter(name = "propertyId", in = ParameterIn.QUERY, description = "Required only for PROPERTY; forbidden for ALL_PROPERTIES.", schema = @Schema(type = "string", format = "uuid"))
    })
    @ApiResponse(responseCode = "200", description = "Scoped administrative detail, no credentials or session metadata.",
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
            content = @Content(schema = @Schema(implementation = Detail.class)))
    @ApiResponse(responseCode = "404", description = "STAFF_USER_NOT_FOUND, identical for absent or inaccessible target.",
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = StaffAdminReadModels.Error.class)))
    @ApiResponse(responseCode = "405", description = "Unsupported method for this resource.",
            headers = {@Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
                    @Header(name = "Allow", schema = @Schema(type = "string", allowableValues = "GET, HEAD, PATCH"))}, content = @Content)
    public Detail user(@Parameter(schema = @Schema(type = "string", format = "uuid")) @PathVariable String id,
            @Parameter(hidden = true) @RequestParam MultiValueMap<String, String> query) { return reads.user(id, query); }
}
