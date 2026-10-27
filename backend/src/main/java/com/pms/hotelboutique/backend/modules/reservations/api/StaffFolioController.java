package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.StaffFolioHttpService;
import com.pms.hotelboutique.backend.modules.reservations.application.StaffFolioModels.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Validator;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/properties/{propertyId}/folios")
@Tag(name = "Staff folios")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(responseCode = "400", description = "Invalid closed parameters, exact amount, currency or operation key", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "401", description = "Active Staff session required; Guest credentials rejected", content = @Content)
@ApiResponse(responseCode = "403", description = "FOLIO_PAYMENT_OPERATE or explicit property membership missing", content = @Content)
@ApiResponse(responseCode = "404", description = "Resource absent inside authorized property; identical for foreign ids", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
public class StaffFolioController {
    private final StaffFolioHttpService service;
    private final tools.jackson.databind.ObjectMapper json;
    private final Validator validator;
    public StaffFolioController(StaffFolioHttpService service, tools.jackson.databind.ObjectMapper json, Validator validator) {
        this.service = service; this.json = json; this.validator = validator;
    }

    @GetMapping
    @Operation(operationId = "listStaffReservationFolios", summary = "List folios of one reservation in an authorized property",
            description = "FOLIO_PAYMENT_OPERATE; no global or ALL_PROPERTIES query. Stable ascending createdAt/id keyset pagination, default50/max100. Cursors are bound to property and reservation. All responses private,no-store.")
    @ApiResponse(responseCode = "200", description = "Scoped headers, including empty items", content = @Content(mediaType = "application/json", schema = @Schema(implementation = FolioPage.class)))
    public ResponseEntity<FolioPage> list(HttpServletRequest request, @PathVariable UUID propertyId,
            @RequestParam UUID reservationId, @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String cursor,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request, Set.of("reservationId", "limit", "cursor"));
        return ok(service.list(principal, propertyId, reservationId, limit, cursor));
    }

    @GetMapping("/{folioId}")
    @Operation(operationId = "getStaffFolio", summary = "Read folio header, signed balance and movement count",
            description = "FOLIO_PAYMENT_OPERATE and explicit property scope. Empty ledger is unverifiable, not evidence of payment. Currency is the ledger currency; no FX. All responses private,no-store.")
    @ApiResponse(responseCode = "200", description = "Coherent ledger snapshot", content = @Content(mediaType = "application/json", schema = @Schema(implementation = Detail.class)))
    public ResponseEntity<Detail> detail(HttpServletRequest request, @PathVariable UUID propertyId, @PathVariable UUID folioId,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request, Set.of()); return ok(service.detail(principal, propertyId, folioId));
    }

    @GetMapping("/{folioId}/movements")
    @Operation(operationId = "listStaffFolioMovements", summary = "Read immutable signed ledger movements",
            description = "FOLIO_PAYMENT_OPERATE and explicit property scope. Ascending createdAt/id; default50/max100, context-bound cursor. PAYMENT reduces debt. No writes in GET. All responses private,no-store.")
    @ApiResponse(responseCode = "200", description = "Scoped movement page", content = @Content(mediaType = "application/json", schema = @Schema(implementation = MovementPage.class)))
    public ResponseEntity<MovementPage> movements(HttpServletRequest request, @PathVariable UUID propertyId, @PathVariable UUID folioId,
            @RequestParam(defaultValue = "50") int limit, @RequestParam(required = false) String cursor,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request, Set.of("limit", "cursor")); return ok(service.movements(principal, propertyId, folioId, limit, cursor));
    }

    @PostMapping(value = "/{folioId}/payments", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "registerStaffFolioPayment", summary = "Record a received partial or full payment without charging a bank",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true, content = @Content(mediaType = "application/json", schema = @Schema(implementation = PaymentRequest.class))),
            description = "FOLIO_PAYMENT_OPERATE; linked GUEST/OPEN folio only. Positive exact amount <= current debt, same currency, required description. Shared reservation financial lock serializes balance checks with writers and checkout. Append-only movement, audit and idempotency receipt commit atomically. Same key/body replays the original receipt even after settlement; current authorization is always revalidated. No PAN/CVV or PSP.")
    @ApiResponse(responseCode = "201", description = "Original or replayed immutable payment receipt; refresh balance separately", content = @Content(mediaType = "application/json", schema = @Schema(implementation = PaymentReceipt.class)))
    @ApiResponse(responseCode = "409", description = "FOLIO_NOT_PAYABLE, FOLIO_NOT_OPEN, BALANCE_UNVERIFIABLE, PAYMENT_EXCEEDS_BALANCE or IDEMPOTENCY_KEY_REUSED", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<PaymentReceipt> pay(HttpServletRequest request, @PathVariable UUID propertyId, @PathVariable UUID folioId,
            @RequestHeader("Idempotency-Key") @Parameter(description = "8–128 non-control characters. Repeat exact operation after uncertain transport", schema = @Schema(minLength = 8, maxLength = 128)) String key,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request, Set.of());
        PaymentRequest body;
        try {
            // Bound chunked bodies too, before JSON deserialization or untrusted field allocation.
            byte[] bytes = request.getInputStream().readNBytes(2049);
            if (bytes.length > 2048) throw new IllegalArgumentException("Payment body too large");
            body = json.readerFor(PaymentRequest.class).with(tools.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readValue(bytes);
        } catch (java.io.IOException | tools.jackson.core.JacksonException error) {
            throw new IllegalArgumentException("Invalid payment body");
        }
        if (body == null || !validator.validate(body).isEmpty()) throw new IllegalArgumentException("Invalid payment fields");
        return ResponseEntity.status(201).header("Cache-Control", "private, no-store")
                .body(service.pay(principal, propertyId, folioId, key, body));
    }
    private static void validate(HttpServletRequest request, Set<String> allowed) {
        request.getParameterMap().forEach((key, values) -> {
            if (!allowed.contains(key) || values.length != 1 || values[0].isBlank()) throw new IllegalArgumentException("Invalid folio parameters");
        });
    }
    private static <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().header("Cache-Control", "private, no-store").body(body); }
}
