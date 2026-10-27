package com.pms.hotelboutique.backend.modules.operations.application;
import com.pms.hotelboutique.backend.modules.operations.application.RoomServiceModels.*;
import com.pms.hotelboutique.backend.modules.operations.application.RoomServiceModels.Period;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class RoomServiceScheduleTests {
 private final LocalDate date=LocalDate.parse("2030-01-02");
 private GuestServiceContext.Context context(LocalDate departure,String timezone){return new GuestServiceContext.Context(UUID.randomUUID(),null,null,date.minusDays(1),departure,"IN_HOUSE","CONFIRMED",timezone);}
 private OrderInput input(String time,Period period){return new OrderInput(date,time,List.of(new LineInput(UUID.randomUUID(),1,period)),null);}
 @Test void mealWindowsHaveCorrectInclusiveStartsExclusiveEndsAndBeverage23Boundary(){
  var c=context(date.plusDays(1),"America/Guatemala");var now=Instant.parse("2030-01-01T00:00:00Z");
  for(var sample:Map.of("06:30",Period.BREAKFAST,"11:30",Period.LUNCH,"17:00",Period.DINNER,"23:00",Period.BEVERAGES).entrySet())assertDoesNotThrow(()->RoomServiceRequestService.validateSchedule(c,input(sample.getKey(),sample.getValue()),now,1800));
  for(var sample:Map.of("11:30",Period.BREAKFAST,"17:00",Period.LUNCH,"22:00",Period.DINNER,"23:01",Period.BEVERAGES).entrySet())assertThrows(ResponseStatusException.class,()->RoomServiceRequestService.validateSchedule(c,input(sample.getKey(),sample.getValue()),now,1800));
 }
 @Test void thirtyMinutesUsesPropertyTimezoneAndExactRealStart(){var c=context(date.plusDays(1),"America/Guatemala");var order=input("09:00",Period.BREAKFAST);
  assertEquals(Instant.parse("2030-01-02T15:00:00Z"),RoomServiceRequestService.scheduledAt(c,order));assertDoesNotThrow(()->RoomServiceRequestService.validateSchedule(c,order,Instant.parse("2030-01-02T14:30:00Z"),1800));assertThrows(ResponseStatusException.class,()->RoomServiceRequestService.validateSchedule(c,order,Instant.parse("2030-01-02T14:30:01Z"),1800));
 }
 @Test void normalCheckoutDoesNotAcceptSimulatedLateCheckoutOrLunchDinner(){var c=context(date,"America/Guatemala");var now=Instant.parse("2030-01-01T00:00:00Z");
  assertDoesNotThrow(()->RoomServiceRequestService.validateSchedule(c,input("12:00",Period.BEVERAGES),now,1800));
  for(var sample:Map.of("12:01",Period.BEVERAGES,"11:45",Period.LUNCH,"18:00",Period.DINNER).entrySet())assertThrows(ResponseStatusException.class,()->RoomServiceRequestService.validateSchedule(c,input(sample.getKey(),sample.getValue()),now,1800));
 }
 @Test void persistedCutoffIsStrictAndStateMustBeOpen(){var c=context(date.plusDays(1),"America/Guatemala");var due=Instant.parse("2030-01-02T15:00:00Z");var row=new ServiceRequest(UUID.randomUUID(),c.propertyId(),ServiceRequest.Category.ROOM_SERVICE,"Room Service",due.minusSeconds(7200));row.scheduleFor(due,due.minusSeconds(7200));
  assertDoesNotThrow(()->RoomServiceRequestService.requireModifiable(c,row,due.minusSeconds(1501)));assertThrows(ResponseStatusException.class,()->RoomServiceRequestService.requireModifiable(c,row,due.minusSeconds(1500)));row.startProgress(due.minusSeconds(3000));assertThrows(ResponseStatusException.class,()->RoomServiceRequestService.requireModifiable(c,row,due.minusSeconds(2000)));
 }
 @Test void validatesDatesQuantitiesDuplicatesAndNormalizesNotes(){var c=context(date.plusDays(1),"America/Guatemala");var row=input("09:00",Period.BREAKFAST);var notes=new OrderInput(date,"09:00",row.items(),"  Notes  ");assertEquals("Notes",RoomServiceRequestService.normalize(notes).notes());
  assertThrows(ResponseStatusException.class,()->RoomServiceRequestService.normalize(new OrderInput(date,"09:00",List.of(row.items().get(0),row.items().get(0)),null)));
  assertThrows(ResponseStatusException.class,()->RoomServiceRequestService.validateSchedule(c,new OrderInput(date.plusDays(2),"09:00",row.items(),null),Instant.parse("2030-01-01T00:00:00Z"),1800));
 }
}
