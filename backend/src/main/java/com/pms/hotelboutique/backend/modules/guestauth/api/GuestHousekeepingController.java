package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.operations.application.GuestHousekeepingService;
import com.pms.hotelboutique.backend.modules.operations.application.GuestHousekeepingService.RequestView;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping(value = "/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}/housekeeping-requests", produces = "application/json")
@Tag(name = "Guest housekeeping")
@SecurityRequirement(name = "guestBearerAuth")
@ApiResponse(responseCode = "400", description = "UUID, body, notes, date, slot or idempotency key invalid", content = @Content)
@ApiResponse(responseCode = "401", description = "Active Guest session required; Staff rejected", content = @Content)
@ApiResponse(responseCode = "404", description = "Stay unavailable or not linked to this Guest; indistinguishable", content = @Content)
public class GuestHousekeepingController {
    private final GuestHousekeepingService service;
    public GuestHousekeepingController(GuestHousekeepingService service) { this.service = service; }

    @Schema(name = "CreateGuestHousekeeping", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record CreateRequest(@NotNull LocalDate serviceDate,
            @NotNull @Schema(allowableValues = {"09:00–10:00", "10:00–11:00", "11:00–12:00", "12:00–13:00", "14:00–15:00"}) String timeSlot,
            @NotNull @Schema(allowableValues = "FULL_CLEANING") String cleaningType,
            @Size(max = 500) @Schema(nullable = true, maxLength = 500) String notes) {
        @JsonAnySetter public void rejectUnknown(String key, Object value) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown request field");
        }
    }

    @Schema(name = "GuestHousekeepingVersion", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record VersionRequest(@NotNull Instant expectedUpdatedAt) {
        @JsonAnySetter public void rejectUnknown(String key, Object value) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown request field"); }
    }
    @Schema(name = "EditGuestHousekeeping", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record EditRequest(@NotNull Instant expectedUpdatedAt, @NotNull LocalDate serviceDate,
            @NotNull @Schema(allowableValues = {"09:00–10:00", "10:00–11:00", "11:00–12:00", "12:00–13:00", "14:00–15:00"}) String timeSlot,
            @NotNull @Schema(allowableValues = "FULL_CLEANING") String cleaningType,
            @Size(max = 500) @Schema(nullable = true, maxLength = 500) String notes) {
        @JsonAnySetter public void rejectUnknown(String key, Object value) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown request field"); }
    }

    @PostMapping("/{requestId}/cancel")
    @Operation(summary = "Cancelar mi solicitud de limpieza", description = "Guest y vínculo propio revalidados. Solo OPEN antes de dueAt-25min del servidor, CAS expectedUpdatedAt. Soft transition CANCELLED; replay CANCELLED sin transición/auditoría adicional. No permite DONE ni acciones Staff.")
    @ApiResponse(responseCode = "200", description = "Persisted cancellation or replay", headers = @Header(name = "Cache-Control", description = "private, no-store"), content = @Content(schema = @Schema(implementation = RequestView.class)))
    @ApiResponse(responseCode = "409", description = "State, cutoff, stay or timestamp conflict", content = @Content)
    public ResponseEntity<RequestView> cancel(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal,
            @PathVariable UUID reservationId, @PathVariable UUID stayId, @PathVariable UUID requestId,
            @Valid @RequestBody VersionRequest body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
            .body(service.cancel(principal, reservationId, stayId, requestId, body.expectedUpdatedAt()));
    }

    @PutMapping("/{requestId}")
    @Operation(summary = "Editar mi solicitud de limpieza", description = "Mismo ID, solo OPEN antes del cutoff25min; CAS updatedAt y lock transaccional. Misma programación conserva cutoff25; nueva fecha exige anticipación30min. Zona de propiedad, cinco franjas MVP/FULL_CLEANING, notas trim/max500. PUT idéntico no agrega auditoría. No cambia habitación física.")
    @ApiResponse(responseCode = "200", description = "Persisted request with new timestamp or exact no-op", headers = @Header(name = "Cache-Control", description = "private, no-store"), content = @Content(schema = @Schema(implementation = RequestView.class)))
    @ApiResponse(responseCode = "409", description = "State, cutoff, stay or timestamp conflict", content = @Content)
    public ResponseEntity<RequestView> edit(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal,
            @PathVariable UUID reservationId, @PathVariable UUID stayId, @PathVariable UUID requestId,
            @Valid @RequestBody EditRequest body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(service.edit(principal,
            reservationId, stayId, requestId, body.expectedUpdatedAt(), body.serviceDate(), body.timeSlot(), body.cleaningType(), body.notes()));
    }

    @PostMapping
    @Operation(summary = "Solicitar limpieza de mi estancia", description = "OPEN persistido en service_requests. Sesión Guest y vínculo revalidados; contexto derivado del servidor. Zona horaria de propiedad, anticipación >=30 minutos, fecha dentro de estancia, final <=12:00 del departure. Cinco franjas MVP y FULL_CLEANING, sin cargos ni cambios de estado físico de habitación. Idempotency-Key 16–100 caracteres alfanuméricos/guiones; replay exacto devuelve el original incluso después del horario.")
    @ApiResponse(responseCode = "201", description = "Created", headers = @Header(name = "Cache-Control", description = "private, no-store"), content = @Content(schema = @Schema(implementation = RequestView.class)))
    @ApiResponse(responseCode = "200", description = "Idempotent replay", headers = @Header(name = "Cache-Control", description = "private, no-store"), content = @Content(schema = @Schema(implementation = RequestView.class)))
    @ApiResponse(responseCode = "409", description = "Stay ineligible or key used with another payload", content = @Content)
    public ResponseEntity<RequestView> create(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal,
            @PathVariable UUID reservationId, @PathVariable UUID stayId,
            @RequestHeader("Idempotency-Key") @Parameter(description = "Stable per intent, 16–100 alphanumeric characters or hyphens", required = true, schema = @Schema(minLength = 16, maxLength = 100, pattern = "[A-Za-z0-9-]+")) String key,
            @Valid @RequestBody CreateRequest body) {
        var created = service.create(principal, reservationId, stayId, key, body.serviceDate(), body.timeSlot(), body.cleaningType(), body.notes());
        return ResponseEntity.status(created.replay() ? HttpStatus.OK : HttpStatus.CREATED)
            .cacheControl(CacheControl.noStore().cachePrivate()).body(created.request());
    }

    @GetMapping
    @Operation(summary = "Mis solicitudes de limpieza de esta estancia", description = "Fuente persistida, todos los estados. No acepta identidad o scope del cliente. Sin polling ni mutaciones Guest administrativas.")
    @ApiResponse(responseCode = "200", description = "Own persisted requests", headers = @Header(name = "Cache-Control", description = "private, no-store"), content = @Content(array = @ArraySchema(schema = @Schema(implementation = RequestView.class))))
    public ResponseEntity<List<RequestView>> list(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal,
            @PathVariable UUID reservationId, @PathVariable UUID stayId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(service.list(principal, reservationId, stayId));
    }
}
