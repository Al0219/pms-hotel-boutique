package com.pms.hotelboutique.backend.modules.operations.application;
import com.pms.hotelboutique.backend.modules.operations.application.AmenitiesModels.*;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class AmenitiesScheduleTests {
 private final LocalDate date=LocalDate.parse("2030-01-02");
 private GuestServiceContext.Context context(LocalDate departure,String timezone){return new GuestServiceContext.Context(UUID.randomUUID(),null,null,date.minusDays(1),departure,"IN_HOUSE","CONFIRMED",timezone);}
 private OrderInput input(String time){return new OrderInput(date,time,List.of(new LineInput(UUID.randomUUID(),1)),null);}
 @Test void thirtyMinuteBoundaryUsesThePropertyTimezone(){var c=context(date.plusDays(1),"America/Guatemala");var input=input("09:00");
  assertEquals(Instant.parse("2030-01-02T15:00:00Z"),AmenitiesRequestService.scheduledAt(c,input));assertDoesNotThrow(()->AmenitiesRequestService.validateSchedule(c,input,Instant.parse("2030-01-02T14:30:00Z"),1800));assertThrows(ResponseStatusException.class,()->AmenitiesRequestService.validateSchedule(c,input,Instant.parse("2030-01-02T14:30:00.001Z"),1800));
  assertEquals(Instant.parse("2030-01-02T00:00:00Z"),AmenitiesRequestService.scheduledAt(context(date.plusDays(1),"Asia/Tokyo"),input));
 }
 @Test void checkoutIsNormalNoonWithoutAnExtension(){var c=context(date,"America/Guatemala");var now=Instant.parse("2030-01-01T00:00:00Z");assertDoesNotThrow(()->AmenitiesRequestService.validateSchedule(c,input("12:00"),now,1800));assertThrows(ResponseStatusException.class,()->AmenitiesRequestService.validateSchedule(c,input("12:01"),now,1800));}
 @Test void cutoffIsStrictAndInProgressIsReadOnly(){var c=context(date.plusDays(1),"America/Guatemala");var due=Instant.parse("2030-01-02T15:00:00Z");var row=new ServiceRequest(UUID.randomUUID(),c.propertyId(),ServiceRequest.Category.AMENITIES,"Amenidades",due.minusSeconds(7200));row.scheduleFor(due,due.minusSeconds(7200));
  assertDoesNotThrow(()->AmenitiesRequestService.requireModifiable(c,row,due.minusSeconds(1501)));assertThrows(ResponseStatusException.class,()->AmenitiesRequestService.requireModifiable(c,row,due.minusSeconds(1500)));row.startProgress(due.minusSeconds(3000));assertThrows(ResponseStatusException.class,()->AmenitiesRequestService.requireModifiable(c,row,due.minusSeconds(2000)));
 }
 @Test void validatesUniqueLinesIntegersNotesAndStayDates(){var c=context(date.plusDays(1),"America/Guatemala");var row=input("09:00");assertEquals("Notes",AmenitiesRequestService.normalize(new OrderInput(date,"09:00",row.items()," Notes ")).notes());assertNull(AmenitiesRequestService.normalize(new OrderInput(date,"09:00",row.items()," ")).notes());
  assertThrows(ResponseStatusException.class,()->AmenitiesRequestService.normalize(new OrderInput(date,"09:00",List.of(row.items().get(0),row.items().get(0)),null)));
  assertThrows(ResponseStatusException.class,()->AmenitiesRequestService.validateSchedule(c,new OrderInput(date.plusDays(2),"09:00",row.items(),null),Instant.parse("2030-01-01T00:00:00Z"),1800));
 }
 @Test void rejectsNonexistentAndAmbiguousPropertyWallTimes(){var c=context(date.plusYears(1),"America/New_York");
  for(var sample:List.of(new OrderInput(LocalDate.parse("2030-03-10"),"02:30",input("09:00").items(),null),new OrderInput(LocalDate.parse("2030-11-03"),"01:30",input("09:00").items(),null)))assertThrows(ResponseStatusException.class,()->AmenitiesRequestService.scheduledAt(c,sample));
 }
}
