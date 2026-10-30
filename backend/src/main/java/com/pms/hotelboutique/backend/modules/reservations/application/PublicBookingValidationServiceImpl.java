package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.PublicBookingPropertyRepository;
import jakarta.validation.Validator;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingValidationException.Code.*;

@Service
@Transactional(readOnly = true)
public class PublicBookingValidationServiceImpl implements PublicBookingValidationService {
    private static final Set<String> COUNTRIES = Set.of(Locale.getISOCountries());
    private static final Comparator<PublicBookingRequest.Stay> STAY_ORDER = Comparator
            .comparing((PublicBookingRequest.Stay stay) -> stay.roomTypeId().toString())
            .thenComparing(PublicBookingRequest.Stay::ratePlanId)
            .thenComparingInt(PublicBookingRequest.Stay::quantity);

    private final Validator validator;
    private final PublicBookingPropertyRepository properties;

    public PublicBookingValidationServiceImpl(Validator validator, PublicBookingPropertyRepository properties) {
        this.validator = validator;
        this.properties = properties;
    }

    @Override
    public String validateAndHash(String idempotencyKey, PublicBookingRequest request) {
        validateKey(idempotencyKey);
        if (request == null || !validator.validate(request).isEmpty()) {
            throw new PublicBookingValidationException(INVALID_REQUEST);
        }
        // LocalDate's ISO formatter also accepts signed/extended years; those do
        // not match the public YYYY-MM-DD / OpenAPI full-date wire contract.
        if (request.arrival().getYear() < 0 || request.arrival().getYear() > 9999
                || request.departure().getYear() < 0 || request.departure().getYear() > 9999) {
            throw new PublicBookingValidationException(INVALID_REQUEST);
        }
        if (!request.arrival().isBefore(request.departure())) {
            throw new PublicBookingValidationException(INVALID_DATE_RANGE);
        }
        var guest = request.bookingGuest();
        if (!validUnicode(guest.firstName()) || !validUnicode(guest.lastName()) || !validUnicode(guest.email())
                || (guest.documentNumber() != null && !validUnicode(guest.documentNumber()))
                || (request.notes() != null && !validUnicode(request.notes()))
                || (guest.country() != null && !COUNTRIES.contains(guest.country()))
                || request.stays().stream().anyMatch(stay -> !validUnicode(stay.ratePlanId()))) {
            throw new PublicBookingValidationException(INVALID_REQUEST);
        }
        if (!properties.existsById(request.propertyId())) {
            throw new PublicBookingValidationException(PROPERTY_NOT_FOUND);
        }
        return fingerprint(request);
    }

    private static void validateKey(String key) {
        if (key == null || key.isBlank() || !validUnicode(key)
                || key.codePointCount(0, key.length()) < 8
                || key.codePointCount(0, key.length()) > 128
                || key.codePoints().anyMatch(Character::isISOControl)) {
            throw new PublicBookingValidationException(INVALID_REQUEST);
        }
    }

    private static boolean validUnicode(String value) {
        return StandardCharsets.UTF_8.newEncoder().canEncode(value);
    }

    /** Versioned UTF-8 fields with big-endian byte lengths; no delimiters or normalization. */
    private static String fingerprint(PublicBookingRequest request) {
        try {
            MessageDigest hash = MessageDigest.getInstance("SHA-256");
            var guest = request.bookingGuest();
            boolean enriched = guest.phone() != null || guest.country() != null
                    || guest.documentNumber() != null || request.notes() != null;
            // Preserve persisted V1 receipts for clients that send the original payload.
            field(hash, enriched ? "PUBLIC_BOOKING_REQUEST_V2" : "PUBLIC_BOOKING_REQUEST_V1");
            field(hash, request.propertyId().toString());
            field(hash, request.arrival().toString());
            field(hash, request.departure().toString());
            field(hash, request.currency());
            field(hash, request.clientTotalMinor().toString());
            field(hash, Integer.toString(request.stays().size()));
            // Sorting preserves duplicates and quantities; it never changes the input list.
            for (var stay : request.stays().stream().sorted(STAY_ORDER).toList()) {
                field(hash, stay.roomTypeId().toString());
                field(hash, stay.ratePlanId());
                field(hash, stay.quantity().toString());
            }
            field(hash, request.bookingGuest().firstName());
            field(hash, request.bookingGuest().lastName());
            field(hash, request.bookingGuest().email());
            if (enriched) {
                nullableField(hash, guest.phone());
                nullableField(hash, guest.country());
                nullableField(hash, guest.documentNumber());
                nullableField(hash, request.notes());
            }
            // The key identifies the receipt. The only valid payment mode is constant.
            return HexFormat.of().formatHex(hash.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required", exception);
        }
    }

    private static void nullableField(MessageDigest hash, String value) {
        if (value == null) hash.update(ByteBuffer.allocate(Integer.BYTES).putInt(-1).array());
        else field(hash, value);
    }

    private static void field(MessageDigest hash, String value) {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        hash.update(ByteBuffer.allocate(Integer.BYTES).putInt(bytes.length).array());
        hash.update(bytes);
    }
}
