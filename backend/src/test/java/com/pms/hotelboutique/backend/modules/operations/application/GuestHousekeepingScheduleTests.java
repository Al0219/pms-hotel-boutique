package com.pms.hotelboutique.backend.modules.operations.application;
import java.time.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class GuestHousekeepingScheduleTests {
    private GuestHousekeepingService.Context context(String zone) {
        return new GuestHousekeepingService.Context(UUID.randomUUID(),null,null,LocalDate.parse("2030-01-01"),
            LocalDate.parse("2030-01-03"),"IN_HOUSE","CONFIRMED",zone);
    }
    @Test void exactThirtyMinutesAndCheckoutDayAreAcceptedInPropertyTimezone() {
        var date=LocalDate.parse("2030-01-03");
        assertDoesNotThrow(()->GuestHousekeepingService.validateSchedule(context("America/Guatemala"),date,Instant.parse("2030-01-03T15:30:00Z")));
        assertThrows(ResponseStatusException.class,()->GuestHousekeepingService.validateSchedule(context("America/Guatemala"),date,Instant.parse("2030-01-03T15:30:01Z")));
    }
    @Test void serverDoesNotInterpretPropertyTimeInPhoneOrUtcZone() {
        var date=LocalDate.parse("2030-01-02");var now=Instant.parse("2030-01-02T12:00:00Z");
        assertDoesNotThrow(()->GuestHousekeepingService.validateSchedule(context("America/Guatemala"),date,now));
        assertThrows(ResponseStatusException.class,()->GuestHousekeepingService.validateSchedule(context("UTC"),date,now));
    }
    @Test void datesBeforeArrivalOrAfterDepartureAreRejected() {
        for(String date:new String[]{"2029-12-31","2030-01-04"}) assertThrows(ResponseStatusException.class,
            ()->GuestHousekeepingService.validateSchedule(context("America/Guatemala"),LocalDate.parse(date),Instant.parse("2029-12-30T00:00:00Z")));
    }
}
