package com.pms.hotelboutique.backend.modules.operations.application;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
/** Per-stay lock also covers Staff intake/reopening. Dates are local to the property. */
@Component
public class HousekeepingSchedulePolicy {
 private final JdbcClient jdbc;private final jakarta.persistence.EntityManager entities;
 public HousekeepingSchedulePolicy(JdbcClient jdbc,jakarta.persistence.EntityManager entities){this.jdbc=jdbc;this.entities=entities;}
 public void validate(UUID property,UUID stay,Instant due,UUID exclude){
  if(stay==null)return;if(due==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Selecciona un horario de limpieza.");
  entities.flush();
  var zone=jdbc.sql("SELECT p.timezone FROM reservation_stays s JOIN properties p ON p.id=s.property_id WHERE s.id=:s AND s.property_id=:p FOR UPDATE OF s").param("s",stay).param("p",property).query(String.class).single();
  var rows=jdbc.sql("SELECT id,due_at FROM service_requests WHERE property_id=:p AND stay_id=:s AND category='HOUSEKEEPING' AND status IN ('OPEN','IN_PROGRESS','DONE') AND due_at IS NOT NULL").param("p",property).param("s",stay).query((rs,n)->Map.entry(rs.getObject("id",UUID.class),rs.getTimestamp("due_at").toInstant())).list();
  var date=due.atZone(ZoneId.of(zone)).toLocalDate();int sameDay=0;
  for(var row:rows){if(row.getKey().equals(exclude))continue;if(row.getValue().atZone(ZoneId.of(zone)).toLocalDate().equals(date))sameDay++;}
  if(sameDay>=2)throw new ResponseStatusException(HttpStatus.CONFLICT,"Máximo 2 limpiezas por día.");
  for(var row:rows)if(!row.getKey().equals(exclude)&&Duration.between(row.getValue(),due).abs().compareTo(Duration.ofHours(8))<0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Separa las limpiezas al menos 8 horas.");
 }
}
