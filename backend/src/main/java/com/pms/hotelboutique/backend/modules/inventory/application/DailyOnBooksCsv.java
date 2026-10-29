package com.pms.hotelboutique.backend.modules.inventory.application;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Objects;

/** Approved C7 CSV representation; never recalculates report metrics. */
public final class DailyOnBooksCsv {
    public static final String HEADER = "propertyId,timezone,currency,stayDate,physicalRooms,outOfOrderRooms,"
            + "availableRooms,onBooksRooms,onBooksPercent,unavailableReason,calculatedAt";

    private DailyOnBooksCsv() { }

    public static String filename(LocalDate from, LocalDate to) {
        return "on-books-daily_" + from + "_" + to + ".csv";
    }

    public static byte[] serialize(DailyOnBooksReport report) {
        Objects.requireNonNull(report.calculatedAt(), "calculatedAt");
        if (report.nights().size() > 50_000) throw new IllegalStateException("Invalid report rows");
        var csv = new StringBuilder("\uFEFF").append(HEADER).append("\r\n");
        for (var row : report.nights()) {
            if (row.propertyId() == null || row.stayDate() == null || row.physicalRooms() < 0
                    || row.outOfOrderRooms() < 0 || row.availableRooms() < 0 || row.onBooksRooms() < 0
                    || row.availableRooms() != row.physicalRooms() - row.outOfOrderRooms()
                    || (row.availableRooms() == 0
                        ? row.onBooksPercent() != null || !"NO_AVAILABLE_ROOMS".equals(row.unavailableReason())
                        : row.onBooksPercent() == null || row.onBooksPercent().signum() < 0 || row.unavailableReason() != null)) {
                throw new IllegalStateException("Invalid report row");
            }
            csv.append(text(row.propertyId().toString())).append(',')
                    .append(text(row.timezone())).append(',').append(text(row.currency())).append(',')
                    .append(row.stayDate()).append(',').append(row.physicalRooms()).append(',')
                    .append(row.outOfOrderRooms()).append(',').append(row.availableRooms()).append(',')
                    .append(row.onBooksRooms()).append(',')
                    .append(row.onBooksPercent() == null ? "" : row.onBooksPercent().setScale(2).toPlainString()).append(',')
                    .append(row.unavailableReason() == null ? "" : text(row.unavailableReason())).append(',')
                    .append(report.calculatedAt()).append("\r\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    static String text(String value) {
        if (value == null || value.isBlank()) throw new IllegalStateException("Missing CSV field");
        int first = 0;
        while (first < value.length() && (Character.isWhitespace(value.charAt(first))
                || Character.isISOControl(value.charAt(first)))) first++;
        boolean formula = first < value.length() && "=+-@".indexOf(value.charAt(first)) >= 0;
        if ("\t\r\n".indexOf(value.charAt(0)) >= 0 || formula) value = "'" + value;
        return value.indexOf(',') >= 0 || value.indexOf('"') >= 0 || value.indexOf('\r') >= 0 || value.indexOf('\n') >= 0
                ? "\"" + value.replace("\"", "\"\"") + "\"" : value;
    }
}
