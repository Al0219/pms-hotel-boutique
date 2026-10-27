package com.pms.hotelboutique.backend.modules.reservations.application;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.deser.std.StdDeserializer;

/** Monetary decimals and descriptions must be JSON text, without scalar coercion. */
public final class StaffFolioTextDeserializer extends StdDeserializer<String> {
    public StaffFolioTextDeserializer() { super(String.class); }
    @Override public String deserialize(JsonParser parser, DeserializationContext context) {
        return switch (parser.currentToken()) {
            case VALUE_STRING -> parser.getString();
            default -> context.reportInputMismatch(String.class, "JSON string required");
        };
    }
}
