package com.pms.hotelboutique.backend.modules.reservations.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Validator;
import jakarta.validation.constraints.*;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.ObjectMapper;
import static com.pms.hotelboutique.backend.modules.reservations.application.StaffCancellationModels.*;

@RestController
@RequestMapping("/api/v1/reservations/{reservationId}")
@Tag(name="Staff reservations")
@SecurityRequirement(name="bearerAuth")
@ApiResponse(responseCode="400",description="Invalid UUID, query, JSON, reason, fingerprint or idempotency key",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
@ApiResponse(responseCode="401",description="Active Staff session required; Guest is not Staff",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
@ApiResponse(responseCode="403",description="Requires RESERVATION_MANAGE, FOLIO_PAYMENT_OPERATE and live property membership",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
@ApiResponse(responseCode="404",description="Reservation not found inside the authorized property",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
@ApiResponse(responseCode="500",description="Technical failure; cancellation transaction is rolled back",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
public class StaffReservationCancellationController {
    private final StaffReservationCancellationService service;
    private final Validator validator;
    private final ObjectMapper json;
    public StaffReservationCancellationController(StaffReservationCancellationService service,Validator validator,ObjectMapper json) {
        this.service=service; this.validator=validator; this.json=json;
    }

    @GetMapping("/cancellation-preview")
    @Operation(operationId="previewStaffReservationCancellation",summary="Preview total pre-arrival cancellation and 10% lodging penalty",
            description="Read-only repeatable snapshot with live Staff scope/permissions. Original lodging charge must be verifiable from a supported booking creation and an OPEN GUEST folio. Blocks started/terminal stays, commercial/incomplete records, multiple charges/folios and prior adjustments. No current-rate lookup or penalty from frontend. Completed cancellations expose their original immutable receipt. No financial writes, no card data.")
    @ApiResponse(responseCode="200",description="Eligible calculation, blocking code, or completed cancellation",content=@Content(schema=@Schema(implementation=Preview.class)))
    public ResponseEntity<Preview> preview(HttpServletRequest request,@PathVariable @Parameter(schema=@Schema(type="string",format="uuid")) String reservationId,
            @RequestParam UUID propertyId,@Parameter(hidden=true) @AuthenticationPrincipal StaffPrincipal principal) {
        validateQuery(request);
        return ResponseEntity.ok().header("Cache-Control","private, no-store").body(service.preview(principal,propertyId,uuid(reservationId)));
    }

    @Schema(name="StaffCancellationRequest",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Request(@NotNull @Pattern(regexp="^[a-f0-9]{64}$") String expectedFingerprint,
            @NotBlank @Size(max=255) @Pattern(regexp="^(?![\\s\\S]*\\x00)[\\s\\S]*$") String reason) {
        @JsonAnySetter public void rejectUnknown(String field,Object value) { throw new IllegalArgumentException("Unknown cancellation field"); }
    }

    @PostMapping(value="/cancellation",consumes="application/json",produces="application/json")
    @Operation(operationId="cancelStaffReservation",summary="Cancel all reserved stays and replace lodging with a 10% penalty",
            description="RESERVATION_MANAGE and FOLIO_PAYMENT_OPERATE with explicit live PROPERTY scope. Requires unchanged preview fingerprint, reason trimmed and bounded to255, and Idempotency-Key. Serializes with folio writers and stay lifecycle. Atomically appends lodging reversal, 10% charge (HALF_UP to minor unit), Staff audit and operation receipt, and cancels parent/all RESERVED stays. Original payments, dates, rooms, guest notes and receipts remain intact. Excess payment is credit; shortfall is debt. No refund, provider call, room cleaning change or folio closure. Retry exact request after unknown transport; same key/different payload conflicts. Receipt amounts describe the cancellation instant.")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(required=true,content=@Content(schema=@Schema(implementation=Request.class)))
    @ApiResponse(responseCode="200",description="Original immutable cancellation result, including replay",content=@Content(schema=@Schema(implementation=Result.class)))
    @ApiResponse(responseCode="409",description="STALE_PREVIEW, ALREADY_CANCELLED, STAY_NOT_RESERVED, UNSUPPORTED_RESERVATION, FINANCIAL_REVIEW_REQUIRED or IDEMPOTENCY_KEY_REUSED",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
    public ResponseEntity<Result> cancel(HttpServletRequest request,@PathVariable @Parameter(schema=@Schema(type="string",format="uuid")) String reservationId,
            @RequestParam UUID propertyId,
            @RequestHeader("Idempotency-Key") @Parameter(required=true,schema=@Schema(minLength=8,maxLength=128)) String key,
            @Parameter(hidden=true) @AuthenticationPrincipal StaffPrincipal principal) {
        validateQuery(request);
        Request body;
        try {
            byte[] bytes=request.getInputStream().readNBytes(4097);
            if (bytes.length>4096) throw new IllegalArgumentException("Cancellation body too large");
            body=json.readValue(bytes,Request.class);
        } catch (IOException | tools.jackson.core.JacksonException error) { throw new IllegalArgumentException("Invalid cancellation body"); }
        if (body==null || !validator.validate(body).isEmpty()) throw new IllegalArgumentException("Invalid cancellation body");
        return ResponseEntity.ok().header("Cache-Control","private, no-store").body(service.cancel(
                principal,propertyId,uuid(reservationId),key,body.expectedFingerprint(),body.reason()));
    }

    private static UUID uuid(String value) {
        if(value==null || !value.matches("[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}"))
            throw new IllegalArgumentException("Reservation UUID required");
        return UUID.fromString(value);
    }

    private static void validateQuery(HttpServletRequest request) {
        var parameters=request.getParameterMap();
        if (!parameters.keySet().equals(Set.of("propertyId")) || parameters.get("propertyId").length!=1
                || !parameters.get("propertyId")[0].matches("[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}"))
            throw new IllegalArgumentException("Explicit single property UUID required");
    }
}
