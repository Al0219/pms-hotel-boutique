package com.pms.hotelboutique.backend.modules.reservations.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.OptBoolean;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import tools.jackson.databind.annotation.JsonDeserialize;

/** Approved public booking input; J3 validates it without creating a booking. */
@Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
public record PublicBookingRequest(
        @NotNull UUID propertyId,
        @Schema(pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", description = "Valid calendar date in YYYY-MM-DD format")
        @NotNull @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd", lenient = OptBoolean.FALSE)
        LocalDate arrival,
        @Schema(pattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", description = "Valid calendar date in YYYY-MM-DD format")
        @NotNull @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd", lenient = OptBoolean.FALSE)
        LocalDate departure,
        @Schema(allowableValues = "GTQ") @NotBlank @Pattern(regexp = "GTQ") String currency,
        @NotNull @JsonDeserialize(using = PublicBookingIntegerDeserializers.ClientTotal.class) Long clientTotalMinor,
        @NotNull @Size(min = 1) List<@NotNull @Valid Stay> stays,
        @NotNull @Valid BookingGuest bookingGuest,
        @NotNull PaymentMode paymentMode) {

    // Match Java's Character.isWhitespace/NotBlank, including Unicode separators
    // but excluding nonbreaking spaces. ECMA-262 syntax also describes the same
    // constraint in OpenAPI. NUL cannot be sent as PostgreSQL text parameters.
    static final String PUBLIC_TEXT_PATTERN = "^(?![\\s\\S]*\\x00)[\\s\\S]*"
            + "[^\\x09-\\x0D\\x1C-\\x20\\u1680\\u2000-\\u2006\\u2008-\\u200A\\u2028\\u2029\\u205F\\u3000][\\s\\S]*$";

    public PublicBookingRequest {
        if (stays != null) {
            // Keep invalid null elements for validation, while preventing later mutation.
            stays = Collections.unmodifiableList(new ArrayList<>(stays));
        }
    }

    public enum PaymentMode { SIMULATED_CARD }

    @Schema(name = "PublicBookingStayRequest", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record Stay(@NotNull UUID roomTypeId,
            @Schema(minLength = 1) @NotBlank @Pattern(regexp = PUBLIC_TEXT_PATTERN) String ratePlanId,
            @NotNull @Positive @JsonDeserialize(using = PublicBookingIntegerDeserializers.Quantity.class) Integer quantity) {
        @JsonAnySetter
        public void rejectUnknown(String field, Object value) {
            throw new IllegalArgumentException("Unknown public booking stay field");
        }
    }

    /** Lengths follow the existing CreateGuestProfileCommand and persistence model. */
    @Schema(name = "PublicBookingGuestRequest", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record BookingGuest(@NotBlank @Pattern(regexp = PUBLIC_TEXT_PATTERN) @Size(min = 1, max = 80) String firstName,
            @NotBlank @Pattern(regexp = PUBLIC_TEXT_PATTERN) @Size(min = 1, max = 80) String lastName,
            @NotBlank @Pattern(regexp = PUBLIC_TEXT_PATTERN) @Email @Size(min = 1, max = 320) String email) {
        @JsonAnySetter
        public void rejectUnknown(String field, Object value) {
            throw new IllegalArgumentException("Unknown public booking guest field");
        }
    }

    @JsonAnySetter
    public void rejectUnknown(String field, Object value) {
        throw new IllegalArgumentException("Unknown public booking field");
    }
}
