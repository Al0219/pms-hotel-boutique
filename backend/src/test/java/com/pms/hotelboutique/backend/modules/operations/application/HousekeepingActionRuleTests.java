package com.pms.hotelboutique.backend.modules.operations.application;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import java.time.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class HousekeepingActionRuleTests {
 @Test void modificationCutoffIsStrictAndUsesPersistedUtcServiceInstant() {
  Instant service=Instant.parse("2030-01-01T16:00:00Z");var row=new ServiceRequest(UUID.randomUUID(),UUID.randomUUID(),ServiceRequest.Category.HOUSEKEEPING,"Limpieza",service.minusSeconds(3600));row.scheduleFor(service,service.minusSeconds(3500));
  assertDoesNotThrow(()->GuestHousekeepingService.requireModifiable(row,service.minusSeconds(1500).minusNanos(1)));
  assertThrows(ResponseStatusException.class,()->GuestHousekeepingService.requireModifiable(row,service.minusSeconds(1500)));
  row.startProgress(service.minusSeconds(3000));assertThrows(ResponseStatusException.class,()->GuestHousekeepingService.requireModifiable(row,service.minusSeconds(2000)));
 }
 @Test void unchangedScheduleAllowsNotesUntil25MinutesButNewScheduleStillRequires30() {
  var date=LocalDate.parse("2030-01-01");var c=new GuestHousekeepingService.Context(UUID.randomUUID(),null,null,date,date.plusDays(2),"IN_HOUSE","CONFIRMED","America/Guatemala");var now=Instant.parse("2030-01-01T15:34:00Z");
  assertDoesNotThrow(()->GuestHousekeepingService.validateSchedule(c,date,now,25*60));
  assertThrows(ResponseStatusException.class,()->GuestHousekeepingService.validateSchedule(c,date,now,30*60));
 }
}
