package com.pms.hotelboutique.backend.modules.reservations.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

/** Contract66: all amounts are exact minor units in the original folio currency. */
public final class StaffCancellationModels {
    private StaffCancellationModels() { }
    public static final String POLICY = "STAFF_PRE_ARRIVAL_TEN_PERCENT_V1";
    public static final String OPERATION = "STAFF_RESERVATION_CANCEL";
    public static final String ACTION = "STAFF_RESERVATION_CANCELLED";

    @Schema(name = "StaffCancellationFinance", description = "Original lodging only; signed balance is penalty minus existing payments. Negative balance is credit, never a refund.")
    public record Finance(UUID folioId, String currency, long accommodationMinor, long paidMinor,
            long penaltyMinor, long balanceAfterMinor, long dueMinor, long creditMinor) { }

    @Schema(name = "StaffCancellationResult", description = "Immutable cancellation receipt; financial amounts describe the cancellation instant, not later postings")
    public record Result(UUID operationId, UUID propertyId, UUID reservationId,
            @Schema(allowableValues = "CANCELLED") String status, String policyCode,
            Instant completedAt, int staysCancelled, Finance financial, String reason) { }

    @Schema(name = "StaffCancellationPreview", description = "Read-only consistent preview; unsupported financial records are blocked rather than repriced or guessed")
    public record Preview(UUID propertyId, UUID reservationId, String confirmationCode, String policyCode,
            int penaltyPercent, boolean canCancel,
            @Schema(types = {"string", "null"}) String blockingCode,
            @Schema(types = {"string", "null"}) String fingerprint,
            int stayCount, @Schema(nullable = true) Finance financial,
            @Schema(nullable = true) Result completed) { }

    /** Stored inside the existing append-only audit event, referenced by the local operation receipt. */
    public record Snapshot(String policyCode, int staysCancelled, Finance financial,
            UUID originalChargeId, UUID compensationId, UUID penaltyChargeId) { }
}
