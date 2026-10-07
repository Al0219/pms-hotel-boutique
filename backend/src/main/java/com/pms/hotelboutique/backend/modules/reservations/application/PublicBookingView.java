package com.pms.hotelboutique.backend.modules.reservations.application;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** The approved response snapshot, with no Guest, scope or card metadata. */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record PublicBookingView(UUID reservationId, String confirmationCode, String status,
        String currency, long totalMinor, PaymentView payment, List<StayView> stays) {
    public PublicBookingView {
        Objects.requireNonNull(reservationId, "reservation identity is required");
        if (confirmationCode == null || confirmationCode.isBlank()
                || !"CONFIRMED".equals(status) || !"GTQ".equals(currency)) {
            throw new IllegalArgumentException("a confirmed GTQ booking is required");
        }
        Objects.requireNonNull(payment, "simulated payment is required");
        stays = List.copyOf(stays);
        if (stays.isEmpty()) { throw new IllegalArgumentException("persisted stays are required"); }
    }

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record PaymentView(String provider, String status, String reference) {
        public PaymentView {
            if (!"SIMULATED".equals(provider) || !"APPROVED".equals(status)
                    || reference == null || reference.isBlank()) {
                throw new IllegalArgumentException("approved simulated payment is required");
            }
        }
    }

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record StayView(UUID reservationStayId, UUID roomTypeId, UUID roomId,
            @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd") LocalDate arrival,
            @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "uuuu-MM-dd") LocalDate departure) {
        public StayView {
            Objects.requireNonNull(reservationStayId, "persisted stay identity is required");
            Objects.requireNonNull(roomTypeId, "real room type identity is required");
            if (roomId != null || arrival == null || departure == null || !arrival.isBefore(departure)) {
                throw new IllegalArgumentException("unassigned stay with valid dates is required");
            }
        }
    }
}
