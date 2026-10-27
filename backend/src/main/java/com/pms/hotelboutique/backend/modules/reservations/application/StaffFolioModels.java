package com.pms.hotelboutique.backend.modules.reservations.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** HTTP read models: exact decimal strings, never floating point or managed entities. */
public final class StaffFolioModels {
    private StaffFolioModels() { }

    @Schema(name = "StaffFolioMoney", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record Money(@NotBlank @Pattern(regexp = "^-?[0-9]{1,19}(\\.[0-9]{1,3})?$")
            @tools.jackson.databind.annotation.JsonDeserialize(using = StaffFolioTextDeserializer.class) String amount,
            @NotBlank @Pattern(regexp = "^[A-Z]{3}$")
            @tools.jackson.databind.annotation.JsonDeserialize(using = StaffFolioTextDeserializer.class) String currency) {
        @JsonAnySetter public void rejectUnknown(String key, Object value) { throw new IllegalArgumentException("Unknown money field"); }
        public static Money from(MonetaryAmount value) {
            return new Money(value.amount().toPlainString(), value.currency().getCurrencyCode());
        }
    }

    @Schema(name = "StaffFolioHeader")
    public record Header(UUID id, UUID propertyId, String type, String status,
            @Schema(types = {"string", "null"}, format = "uuid") UUID reservationId,
            @Schema(types = {"string", "null"}, format = "uuid") UUID stayId,
            @Schema(types = {"string", "null"}, format = "uuid") UUID groupId,
            String currency, @Schema(types = {"string", "null"}) String holderLabel,
            Instant createdAt, Instant updatedAt) {
        public static Header from(FolioView value) {
            return new Header(value.id(), value.propertyId(), value.type().name(), value.status().name(),
                    value.reservationId(), value.stayId(), value.groupId(), value.currency(), value.holderLabel(),
                    value.createdAt(), value.updatedAt());
        }
    }
    @Schema(name = "StaffFolioPage")
    public record FolioPage(UUID propertyId, UUID reservationId, List<Header> items,
            @Schema(types = {"string", "null"}) String nextCursor) { }
    @Schema(name = "StaffFolioDetail")
    public record Detail(Header folio, Money balance, long movementCount) { }
    @Schema(name = "StaffFolioMovement")
    public record Movement(UUID id, UUID folioId, String kind, Money amount, String description,
            @Schema(types = {"string", "null"}, format = "uuid") UUID reversesId,
            @Schema(types = {"string", "null"}, format = "uuid") UUID createdBy, Instant createdAt) { }
    @Schema(name = "StaffFolioMovementPage")
    public record MovementPage(UUID propertyId, UUID folioId, List<Movement> items,
            @Schema(types = {"string", "null"}) String nextCursor) { }
    @Schema(name = "StaffFolioPaymentRequest", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record PaymentRequest(@NotNull @Valid Money amount, @NotBlank @Size(max = 255)
            @tools.jackson.databind.annotation.JsonDeserialize(using = StaffFolioTextDeserializer.class) String description) {
        @JsonAnySetter public void rejectUnknown(String key, Object value) { throw new IllegalArgumentException("Unknown payment field"); }
    }
    @Schema(name = "StaffFolioPaymentReceipt", description = "Immutable receipt of a payment received by reception; not a bank charge or current balance")
    public record PaymentReceipt(UUID operationId, UUID propertyId, UUID folioId,
            UUID movementId, Money amount, Instant completedAt) { }
}
