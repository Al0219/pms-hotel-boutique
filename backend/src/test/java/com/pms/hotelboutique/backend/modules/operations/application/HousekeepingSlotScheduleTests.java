package com.pms.hotelboutique.backend.modules.operations.application;
import java.time.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class HousekeepingSlotScheduleTests {
 private final LocalDate date=LocalDate.parse("2030-01-02");
 private GuestServiceContext.Context context(LocalDate checkout,String zone) {
  return new GuestServiceContext.Context(UUID.randomUUID(),null,null,date.minusDays(1),checkout,"IN_HOUSE","CONFIRMED",zone);
 }
 @Test void allConfiguredSlotsResolveTheirActualStartInPropertyTimezone() {
  var c=context(date.plusDays(2),"America/Guatemala");
  for(String slot:GuestHousekeepingService.MVP_SLOTS) {
   assertDoesNotThrow(()->GuestHousekeepingService.validateSchedule(c,date,slot,Instant.parse("2030-01-02T14:00:00Z"),1800));
   assertEquals(date.atTime(LocalTime.parse(slot.split("–")[0])).atZone(ZoneId.of(c.timezone())).toInstant(),GuestHousekeepingService.serviceInstant(c,date,slot));
  }
 }
 @Test void leadTimeUsesActualSelectedStartAndIncludesExactlyThirtyMinutes() {
  var c=context(date.plusDays(2),"America/Guatemala");
  assertDoesNotThrow(()->GuestHousekeepingService.validateSchedule(c,date,"09:00–10:00",Instant.parse("2030-01-02T14:30:00Z"),1800));
  assertThrows(ResponseStatusException.class,()->GuestHousekeepingService.validateSchedule(c,date,"09:00–10:00",Instant.parse("2030-01-02T14:45:00Z"),1800));
  assertDoesNotThrow(()->GuestHousekeepingService.validateSchedule(c,date,"10:00–11:00",Instant.parse("2030-01-02T14:45:00Z"),1800));
  assertDoesNotThrow(()->GuestHousekeepingService.validateSchedule(c,date,"14:00–15:00",Instant.parse("2030-01-02T19:00:00Z"),1800));
 }
 @Test void checkoutChecksActualEndOnlyOnDeparture() {
  for(String slot:GuestHousekeepingService.MVP_SLOTS) {
   var c=context(date,"America/Guatemala");
   if (java.util.Set.of("12:00–13:00","14:00–15:00","18:00–19:00").contains(slot)) assertThrows(ResponseStatusException.class,()->GuestHousekeepingService.validateSchedule(c,date,slot,Instant.parse("2030-01-02T13:00:00Z"),1800));
   else assertDoesNotThrow(()->GuestHousekeepingService.validateSchedule(c,date,slot,Instant.parse("2030-01-02T13:00:00Z"),1800));
  }
 }
 @Test void unknownSlotsAndOutOfStayDatesFailClosed() {
  var c=context(date.plusDays(1),"America/Guatemala");
  for(String slot:new String[]{"08:00–09:00","13:00–14:00","09:00-10:00","garbage"}) assertThrows(ResponseStatusException.class,()->GuestHousekeepingService.validateSchedule(c,date,slot,Instant.parse("2030-01-01T00:00:00Z"),1800));
  assertThrows(ResponseStatusException.class,()->GuestHousekeepingService.validateSchedule(c,date.plusDays(2),"09:00–10:00",Instant.parse("2030-01-01T00:00:00Z"),1800));
 }
 @Test void offsetsFollowPropertySeasonAndNotJvmTimezone() {
  var c=context(date.plusYears(1),"America/New_York");
  assertEquals(Instant.parse("2030-01-02T14:00:00Z"),GuestHousekeepingService.serviceInstant(c,date,"09:00–10:00"));
  assertEquals(Instant.parse("2030-07-02T13:00:00Z"),GuestHousekeepingService.serviceInstant(c,LocalDate.parse("2030-07-02"),"09:00–10:00"));
 }
}
