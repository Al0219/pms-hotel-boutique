package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.LocalOperationRequest;
import com.pms.hotelboutique.backend.modules.reservations.application.LocalOperationService.OperationDefinition;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class LocalOperationRequestTests {
    private static final OperationDefinition OP = new OperationDefinition("TEST_CHARGE", "FOLIO_PAYMENT_OPERATE");

    @Test
    void canonicalOrderAndDefensiveCopyPreserveTheRequest() {
        var original = new LinkedHashMap<String, String>();
        original.put("currency", "GTQ"); original.put("amountMinor", "10001");
        var request = new LocalOperationRequest("request-123", 1, original);
        String hash = request.fingerprint(OP);
        original.put("amountMinor", "99999");
        assertEquals(hash, request.fingerprint(OP));
        assertEquals(hash, new LocalOperationRequest("request-123", 1,
                Map.of("amountMinor", "10001", "currency", "GTQ")).fingerprint(OP));
        assertThrows(UnsupportedOperationException.class, () -> request.payload().put("currency", "USD"));
    }

    @Test
    void lengthPrefixesPreventAmbiguousFieldsAndDelimiterCollisions() {
        var first = new LocalOperationRequest("request-123", 1, Map.of("a", "bc"));
        var second = new LocalOperationRequest("request-123", 1, Map.of("ab", "c"));
        assertNotEquals(first.fingerprint(OP), second.fingerprint(OP));
        assertNotEquals(new LocalOperationRequest("request-123", 1, Map.of("a", "b|c")).fingerprint(OP),
                new LocalOperationRequest("request-123", 1, Map.of("a|b", "c")).fingerprint(OP));
    }

    @Test
    void bindsVersionAndServerPermissionWithoutRoundingMoney() {
        var fields = Map.of("amountMinor", Long.toString(Long.MAX_VALUE), "currency", "GTQ");
        var request = new LocalOperationRequest("request-123", 1, fields);
        assertEquals(Long.toString(Long.MAX_VALUE), request.payload().get("amountMinor"));
        assertNotEquals(request.fingerprint(OP), new LocalOperationRequest("request-123", 2, fields).fingerprint(OP));
        assertNotEquals(request.fingerprint(OP), request.fingerprint(
                new OperationDefinition("TEST_CHARGE", "PAYMENT_REFUND_VOID")));
    }

    @Test
    void validatesOpaqueKeyBoundariesWithoutNormalizingUnicode() {
        assertDoesNotThrow(() -> new LocalOperationRequest("x".repeat(8), 1, Map.of()));
        assertDoesNotThrow(() -> new LocalOperationRequest("x".repeat(128), 1, Map.of()));
        assertDoesNotThrow(() -> new LocalOperationRequest("😀".repeat(8), 1, Map.of()));
        for (String key : new String[]{"x".repeat(7), "x".repeat(129), " ".repeat(8), "1234567\n", "1234567\uD800"}) {
            assertThrows(IllegalArgumentException.class, () -> new LocalOperationRequest(key, 1, Map.of()));
        }
        var request = new LocalOperationRequest(" Key-123 ", 1, Map.of());
        assertEquals(" Key-123 ", request.key());
    }

    @Test
    void rejectsInvalidPayloadsAndUnapprovedPermissions() {
        assertThrows(IllegalArgumentException.class, () -> new LocalOperationRequest("request-123", 0, Map.of()));
        var fields = new HashMap<String, String>(); fields.put("amountMinor", null);
        assertThrows(IllegalArgumentException.class, () -> new LocalOperationRequest("request-123", 1, fields));
        assertThrows(IllegalArgumentException.class, () -> new OperationDefinition("TEST_CHARGE", "AUDIT_READ"));
        assertThrows(IllegalArgumentException.class, () -> new OperationDefinition("client permission", "FOLIO_PAYMENT_OPERATE"));
    }
}
