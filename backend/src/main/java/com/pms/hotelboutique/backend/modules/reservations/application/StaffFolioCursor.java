package com.pms.hotelboutique.backend.modules.reservations.application;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/** Position only, never an authorization token. SQL always repeats the authorized scope. */
final class StaffFolioCursor {
    record Position(Instant createdAt, UUID id) { }
    static Position decode(String cursor, String context) {
        if (cursor == null) return null;
        if (cursor.length() > 512 || !cursor.matches("[A-Za-z0-9_-]+")) throw invalid();
        try {
            String[] parts = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|", -1);
            if (parts.length != 4 || !parts[0].equals("1") || !parts[1].equals(context)) throw invalid();
            var result = new Position(Instant.parse(parts[2]), UUID.fromString(parts[3]));
            if (!encode(context, result.createdAt(), result.id()).equals(cursor)) throw invalid();
            return result;
        } catch (RuntimeException error) { throw invalid(); }
    }
    static String encode(String context, Instant createdAt, UUID id) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("1|" + context + "|" + createdAt + "|" + id).getBytes(StandardCharsets.UTF_8));
    }
    private static IllegalArgumentException invalid() { return new IllegalArgumentException("Invalid folio cursor"); }
}
