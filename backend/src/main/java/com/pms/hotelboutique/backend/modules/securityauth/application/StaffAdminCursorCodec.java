package com.pms.hotelboutique.backend.modules.securityauth.application;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadException.Failure.INVALID_CURSOR;

/** Independent process-local cursor key: restart/another replica invalidates cursors, not sessions. */
@Component
public class StaffAdminCursorCodec {
    private static final Duration TTL = Duration.ofMinutes(15);
    private final byte[] key = new byte[32];
    private final Clock clock;
    public record Position(String username, UUID id) { }
    public StaffAdminCursorCodec() { this(Clock.systemUTC()); }
    StaffAdminCursorCodec(Clock clock) { this.clock = clock; new SecureRandom().nextBytes(key); }

    public String encode(Position position, String context) {
        try {
            var bytes = new ByteArrayOutputStream();
            try (var data = new DataOutputStream(bytes)) {
                data.writeInt(1); data.writeLong(clock.instant().plus(TTL).getEpochSecond());
                data.write(digest(context)); data.writeUTF(position.username());
                data.writeLong(position.id().getMostSignificantBits()); data.writeLong(position.id().getLeastSignificantBits());
            }
            byte[] payload = bytes.toByteArray();
            return base64(payload) + "." + base64(sign(payload));
        } catch (IOException ex) { throw new IllegalStateException("Cursor encoding failed", ex); }
    }
    public Position decode(String cursor, String context) {
        try {
            if (cursor == null || cursor.length() > 4096) throw new IOException();
            String[] parts = cursor.split("\\.", -1);
            if (parts.length != 2) throw new IOException();
            byte[] payload = Base64.getUrlDecoder().decode(parts[0]);
            byte[] signature = Base64.getUrlDecoder().decode(parts[1]);
            if (!base64(payload).equals(parts[0]) || !base64(signature).equals(parts[1])
                    || !MessageDigest.isEqual(sign(payload), signature)) throw new IOException();
            try (var data = new DataInputStream(new ByteArrayInputStream(payload))) {
                if (data.readInt() != 1) throw new IOException();
                long expires = data.readLong();
                if (expires <= clock.instant().getEpochSecond()
                        || expires > clock.instant().plus(TTL).getEpochSecond()) throw new IOException();
                if (!MessageDigest.isEqual(data.readNBytes(32), digest(context))) throw new IOException();
                String username = data.readUTF();
                UUID id = new UUID(data.readLong(), data.readLong());
                if (username.isBlank() || username.length() > 80 || data.available() != 0) throw new IOException();
                return new Position(username, id);
            }
        } catch (IOException | IllegalArgumentException ex) { throw new StaffAdminReadException(INVALID_CURSOR); }
    }
    private byte[] sign(byte[] payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(payload);
        } catch (GeneralSecurityException ex) { throw new IllegalStateException("HMAC unavailable", ex); }
    }
    private static byte[] digest(String value) {
        try { return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException("SHA-256 unavailable", ex); }
    }
    private static String base64(byte[] bytes) { return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
}
