package com.pms.hotelboutique.backend.modules.reservations.application;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/** Domain-validated, non-secret canonical fields; only their digest is persisted. */
public record LocalOperationRequest(String key, int payloadVersion, Map<String, String> payload) {

    public LocalOperationRequest {
        if (key == null || key.isBlank() || !validUnicode(key)
                || key.codePoints().anyMatch(Character::isISOControl)
                || key.codePointCount(0, key.length()) < 8
                || key.codePointCount(0, key.length()) > 128) {
            throw new IllegalArgumentException("operation key must contain 8–128 valid non-control characters");
        }
        if (payloadVersion < 1 || payload == null) {
            throw new IllegalArgumentException("a positive payload version and canonical fields are required");
        }
        var fields = new TreeMap<String, String>();
        payload.forEach((name, value) -> {
            if (name == null || name.isBlank() || value == null
                    || !validUnicode(name) || !validUnicode(value)) {
                throw new IllegalArgumentException("canonical fields require valid names and values");
            }
            fields.put(name, value);
        });
        payload = Collections.unmodifiableMap(fields);
    }

    public String fingerprint(LocalOperationService.OperationDefinition definition) {
        var parts = new ArrayList<String>();
        parts.add("BD2_LOCAL_REQUEST_V1");
        parts.add(Integer.toString(payloadVersion));
        parts.add(definition.name());
        parts.add(definition.requiredPermission());
        parts.add(Integer.toString(payload.size()));
        payload.forEach((name, value) -> { parts.add(name); parts.add(value); });
        return HexFormat.of().formatHex(digest(parts));
    }

    public long lockId(UUID actorId, UUID propertyId, String operationName) {
        return ByteBuffer.wrap(digest(List.of("BD2_LOCAL_LOCK_V1", actorId.toString(),
                propertyId.toString(), operationName, key))).getLong();
    }

    private static boolean validUnicode(String value) {
        return StandardCharsets.UTF_8.newEncoder().canEncode(value);
    }

    private static byte[] digest(List<String> parts) {
        try {
            MessageDigest hash = MessageDigest.getInstance("SHA-256");
            for (String part : parts) {
                byte[] bytes = part.getBytes(StandardCharsets.UTF_8);
                hash.update(ByteBuffer.allocate(Integer.BYTES).putInt(bytes.length).array());
                hash.update(bytes);
            }
            return hash.digest();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required", exception);
        }
    }
}
