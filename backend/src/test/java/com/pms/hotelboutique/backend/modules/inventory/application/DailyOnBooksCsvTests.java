package com.pms.hotelboutique.backend.modules.inventory.application;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DailyOnBooksCsvTests {
    private static final Instant NOW = Instant.parse("2035-01-01T12:00:00Z");

    private DailyOnBooksReport.Night row(long available, BigDecimal percent) {
        return new DailyOnBooksReport.Night(UUID.fromString("00000000-0000-4000-8000-000000000001"),
                "America/Guatemala", "GTQ", LocalDate.parse("2035-01-01"), available, 0, available, 3,
                percent, available == 0 ? "NO_AVAILABLE_ROOMS" : null);
    }

    @Test void preservesBomCrlfCountsOverbookingAndNullWithoutRecalculation() {
        byte[] bytes = DailyOnBooksCsv.serialize(new DailyOnBooksReport(NOW,
                List.of(row(2, new BigDecimal("150.00")), row(0, null))));
        assertArrayEquals(new byte[]{(byte) 0xef, (byte) 0xbb, (byte) 0xbf}, Arrays.copyOf(bytes, 3));
        String csv = new String(bytes, StandardCharsets.UTF_8);
        assertTrue(csv.startsWith("\uFEFF" + DailyOnBooksCsv.HEADER + "\r\n"));
        assertTrue(csv.contains(",2,0,2,3,150.00,,2035-01-01T12:00:00Z\r\n"));
        assertTrue(csv.contains(",0,0,0,3,,NO_AVAILABLE_ROOMS,2035-01-01T12:00:00Z\r\n"));
        assertEquals(3, csv.split("\r\n").length);
        assertFalse(csv.replace("\r\n", "").contains("\n"));
    }

    @Test void escapesAndNeutralizesEveryTextCellWhilePreservingItsContent() {
        assertEquals("\"Hotel, \"\"Uno\"\"\r\nDos\"", DailyOnBooksCsv.text("Hotel, \"Uno\"\r\nDos"));
        for (String text : List.of("=1+1", "+1", "-1", "@SUM(A1)", "  =1", "\t=1", "\ttexto", "\rtexto", "\ntexto", "\u0001  @A1")) {
            String cell = DailyOnBooksCsv.text(text);
            if (cell.startsWith("\"")) cell = cell.substring(1, cell.length() - 1).replace("\"\"", "\"");
            assertEquals("'" + text, cell);
        }
        assertEquals("America/Guatemala", DailyOnBooksCsv.text("America/Guatemala"));
        assertThrows(IllegalStateException.class, () -> DailyOnBooksCsv.text(" "));
        assertThrows(IllegalStateException.class, () -> DailyOnBooksCsv.text(null));
    }

    @Test void emitsHeaderOnlyForEmptyAndRejectsInvalidRequiredMetrics() {
        assertEquals("\uFEFF" + DailyOnBooksCsv.HEADER + "\r\n", new String(
                DailyOnBooksCsv.serialize(new DailyOnBooksReport(NOW, List.of())), StandardCharsets.UTF_8));
        assertThrows(IllegalStateException.class, () -> DailyOnBooksCsv.serialize(
                new DailyOnBooksReport(NOW, List.of(row(1, null)))));
    }

    @Test void supportsExactRowLimitAndMeasuresMaximumPayload() {
        var rows = Collections.nCopies(50_000, row(2, new BigDecimal("150.00")));
        long start = System.nanoTime();
        byte[] bytes = DailyOnBooksCsv.serialize(new DailyOnBooksReport(NOW, rows));
        long millis = (System.nanoTime() - start) / 1_000_000;
        assertEquals(50_001, new String(bytes, StandardCharsets.UTF_8).split("\r\n").length);
        System.out.println("On-books CSV 50000 rows: " + bytes.length + " bytes, serialize " + millis + " ms");
        assertThrows(IllegalStateException.class, () -> DailyOnBooksCsv.serialize(
                new DailyOnBooksReport(NOW, Collections.nCopies(50_001, rows.getFirst()))));
    }
}
