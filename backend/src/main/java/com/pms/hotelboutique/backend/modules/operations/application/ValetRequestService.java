package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.*;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.ServiceRequestRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.operations.application.GuestServiceContext.Context;
import static com.pms.hotelboutique.backend.modules.operations.application.ValetModels.*;
import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

/** Persisted valet use the existing ServiceRequest lifecycle, Guest boundary and Staff permissions. */
@Service
@Transactional
public class ValetRequestService {
    private final GuestAuthService auth;
    private final GuestServiceContext contexts;
    private final JdbcClient jdbc;
    private final ServiceRequestService operations;
    private final ServiceRequestRepository requests;
    private final AuditService audit;
    private final EntityManager entities;
    private final StaffAuthService staffSessions;
    private final StaffAuthorizationService staffAuthorization;
    private final PropertyScopeResolver scopes;
    private final ObjectMapper json;
    public ValetRequestService(GuestAuthService auth,GuestServiceContext contexts,JdbcClient jdbc,ServiceRequestService operations,
            ServiceRequestRepository requests,AuditService audit,EntityManager entities,StaffAuthService staffSessions,
            StaffAuthorizationService staffAuthorization,PropertyScopeResolver scopes,ObjectMapper json) {
        this.auth=auth;this.contexts=contexts;this.jdbc=jdbc;this.operations=operations;this.requests=requests;this.audit=audit;
        this.entities=entities;this.staffSessions=staffSessions;this.staffAuthorization=staffAuthorization;this.scopes=scopes;this.json=json;
    }
    private GuestPrincipal active(GuestPrincipal p) { if(p==null)throw new GuestAuthenticationException();return auth.getActivePrincipal(p); }
    private static void key(String key){if(key==null||!key.matches("[A-Za-z0-9-]{16,100}"))throw invalid();}
    private String hash(Object value){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsString(value).getBytes(StandardCharsets.UTF_8)));}
        catch(Exception e){throw new IllegalStateException(e);}
    }
    private static Instant next(Instant old){var now=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);return now.isAfter(old)?now:old.plusNanos(1000);}
    private static void version(Instant actual,Instant expected){if(expected==null||!expected.equals(actual))throw conflict();}
    private static VehicleInput normalized(VehicleInput input){
        if(input==null||input.make()==null||input.model()==null||input.platePrefix()==null||input.plateBody()==null||input.location()==null)throw invalid();
        var body=input.plateBody().trim().toUpperCase(Locale.ROOT);var make=input.make().trim();var model=input.model().trim();
        var color=input.color()==null||input.color().isBlank()?null:input.color().trim();
        if(make.isBlank()||make.length()>40||model.isBlank()||model.length()>40||color!=null&&color.length()>30||!body.matches("[0-9]{2,3}[A-Z]{3}")||!input.platePrefix().matches("P|A|C|TE|U|TRC|M|MT|TC|O|CD|CC|MI|DIS")||!input.location().matches("PARKED|WITH_GUEST"))throw invalid();
        return new VehicleInput(make,model,input.platePrefix(),body,color,input.location());
    }
    private Vehicle readVehicle(UUID id,UUID property,boolean lock){
        return jdbc.sql("SELECT v.*,s.reservation_id,s.status stay_status,r.status reservation_status,r.confirmation_code,room.code room_code,(r.status='CONFIRMED' AND s.status IN ('RESERVED','IN_HOUSE')) stay_active,EXISTS(SELECT 1 FROM valet_requests o WHERE o.vehicle_id=v.id AND o.active) has_active FROM valet_vehicles v JOIN reservation_stays s ON s.id=v.stay_id AND s.property_id=v.property_id JOIN reservations r ON r.id=s.reservation_id AND r.property_id=v.property_id LEFT JOIN rooms room ON room.id=s.room_id AND room.property_id=v.property_id WHERE v.id=:id AND v.property_id=:property"+(lock?" FOR UPDATE OF v":""))
            .param("id",id).param("property",property).query((rs,n)->new Vehicle(id,property,rs.getObject("stay_id",UUID.class),rs.getString("make"),rs.getString("model"),rs.getString("plate_prefix"),rs.getString("plate_body"),rs.getString("color"),rs.getString("location"),rs.getTimestamp("created_at").toInstant(),rs.getTimestamp("updated_at").toInstant(),rs.getBoolean("has_active"),rs.getObject("reservation_id",UUID.class),rs.getString("confirmation_code"),rs.getString("room_code"),rs.getString("stay_status"),rs.getString("reservation_status"),rs.getBoolean("stay_active"),rs.getBoolean("stay_active")||rs.getBoolean("has_active")||"PARKED".equals(rs.getString("location")),rs.getObject("saved_vehicle_id",UUID.class),List.of("CHECKED_OUT","CANCELLED","NO_SHOW").contains(rs.getString("stay_status"))&&"PARKED".equals(rs.getString("location"))&&!rs.getBoolean("has_active"))).optional().orElseThrow(ValetRequestService::unavailable);
    }
    private Vehicle ownedVehicle(GuestPrincipal p,Context c,UUID stay,UUID id){
        var exists=jdbc.sql("SELECT EXISTS(SELECT 1 FROM valet_vehicles WHERE id=:id AND guest_account_id=:account AND stay_id=:stay AND property_id=:property)")
            .param("id",id).param("account",p.guestAccountId()).param("stay",stay).param("property",c.propertyId()).query(Boolean.class).single();
        if(!exists)throw unavailable();lockForAssociation(id,c.propertyId());return readVehicle(id,c.propertyId(),true);
    }
    private void lockSaved(UUID id){
        jdbc.sql("SELECT id FROM valet_saved_vehicles WHERE id=:id FOR UPDATE").param("id",id).query(UUID.class).optional().orElseThrow(ValetRequestService::unavailable);
    }
    private void lockForAssociation(UUID id,UUID property){
        var saved=jdbc.sql("SELECT saved_vehicle_id FROM valet_vehicles WHERE id=:id AND property_id=:property").param("id",id).param("property",property).query(UUID.class).optional().orElseThrow(ValetRequestService::unavailable);lockSaved(saved);
    }
    private boolean occupied(UUID saved,UUID except){
        return jdbc.sql("SELECT EXISTS(SELECT 1 FROM valet_vehicles WHERE saved_vehicle_id=:saved AND id<>:except AND operational_active)").param("saved",saved).param("except",except).query(Boolean.class).single();
    }
    private SavedVehicle readSaved(UUID id,UUID account,boolean lock){
        if(lock)lockSaved(id);
        return jdbc.sql("SELECT s.*,NOT EXISTS(SELECT 1 FROM valet_vehicles v WHERE v.saved_vehicle_id=s.id AND v.operational_active) can_associate FROM valet_saved_vehicles s WHERE s.id=:id AND s.guest_account_id=:account")
            .param("id",id).param("account",account).query((rs,n)->new SavedVehicle(id,rs.getString("make"),rs.getString("model"),rs.getString("plate_prefix"),rs.getString("plate_body"),rs.getString("color"),rs.getTimestamp("created_at").toInstant(),rs.getTimestamp("updated_at").toInstant(),rs.getBoolean("can_associate"))).optional().orElseThrow(ValetRequestService::unavailable);
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public List<SavedVehicle> savedVehicles(GuestPrincipal p){var guest=active(p);return jdbc.sql("SELECT id FROM valet_saved_vehicles WHERE guest_account_id=:account ORDER BY created_at,id").param("account",guest.guestAccountId()).query(UUID.class).list().stream().map(id->readSaved(id,guest.guestAccountId(),false)).toList();}
    private Optional<Vehicle> registrationReplay(GuestPrincipal guest,UUID stay,UUID property,String key,String hash){
        var prior=jdbc.sql("SELECT id,initial_payload_hash FROM valet_vehicles WHERE guest_account_id=:account AND stay_id=:stay AND creation_key=:key").param("account",guest.guestAccountId()).param("stay",stay).param("key",key).query((rs,n)->Map.entry(rs.getObject("id",UUID.class),rs.getString("initial_payload_hash"))).optional();
        if(prior.isEmpty())return Optional.empty();if(!prior.get().getValue().equals(hash))throw conflict();return Optional.of(readVehicle(prior.get().getKey(),property,false));
    }
    private Vehicle insertAssociation(GuestPrincipal guest,Context c,UUID stay,UUID saved,String location,String key,String hash){
        var row=readSaved(saved,guest.guestAccountId(),true);if(!row.canAssociate())throw conflict();
        if(jdbc.sql("SELECT EXISTS(SELECT 1 FROM valet_vehicles WHERE saved_vehicle_id=:saved AND stay_id=:stay)").param("saved",saved).param("stay",stay).query(Boolean.class).single())throw conflict();
        var id=UUID.randomUUID();var now=java.sql.Timestamp.from(Instant.now());
        jdbc.sql("INSERT INTO valet_vehicles(id,saved_vehicle_id,guest_account_id,stay_id,property_id,make,model,plate_prefix,plate_body,color,location,creation_key,initial_payload_hash,created_at,updated_at) VALUES (:id,:saved,:account,:stay,:property,:make,:model,:prefix,:body,:color,:location,:key,:hash,:now,:now)")
            .param("id",id).param("saved",saved).param("account",guest.guestAccountId()).param("stay",stay).param("property",c.propertyId()).param("make",row.make()).param("model",row.model()).param("prefix",row.platePrefix()).param("body",row.plateBody()).param("color",row.color()).param("location",location).param("key",key).param("hash",hash).param("now",now).update();
        guestAudit(guest,c,id,"VALET_VEHICLE_ASSOCIATED",null,json.writeValueAsString(Map.of("savedVehicleId",saved,"stayId",stay,"location",location)));return readVehicle(id,c.propertyId(),false);
    }
    public VehicleCreation register(GuestPrincipal p,UUID reservation,UUID stay,String key,VehicleInput input){
        var guest=active(p);
        // Serialize account-wide plate creation across different stays before testing uniqueness.
        jdbc.sql("SELECT id FROM guest_accounts WHERE id=:id FOR UPDATE").param("id",guest.guestAccountId()).query(UUID.class).single();
        var c=contexts.load(guest.guestAccountId(),reservation,stay,true);key(key);var v=normalized(input);var hash=hash(v);
        var replay=registrationReplay(guest,stay,c.propertyId(),key,hash);if(replay.isPresent())return new VehicleCreation(replay.get(),true);
        AmenitiesRequestService.eligible(c);
        if(jdbc.sql("SELECT EXISTS(SELECT 1 FROM valet_saved_vehicles WHERE guest_account_id=:account AND plate_prefix=:prefix AND plate_body=:body)").param("account",guest.guestAccountId()).param("prefix",v.platePrefix()).param("body",v.plateBody()).query(Boolean.class).single())throw conflict();
        var saved=UUID.randomUUID();var now=java.sql.Timestamp.from(Instant.now());
        jdbc.sql("INSERT INTO valet_saved_vehicles(id,guest_account_id,make,model,plate_prefix,plate_body,color,created_at,updated_at) VALUES (:id,:account,:make,:model,:prefix,:body,:color,:now,:now)").param("id",saved).param("account",guest.guestAccountId()).param("make",v.make()).param("model",v.model()).param("prefix",v.platePrefix()).param("body",v.plateBody()).param("color",v.color()).param("now",now).update();
        var result=insertAssociation(guest,c,stay,saved,v.location(),key,hash);guestAudit(guest,c,saved,"VALET_VEHICLE_REGISTERED",null,"{}");return new VehicleCreation(result,false);
    }
    public VehicleCreation associate(GuestPrincipal p,UUID reservation,UUID stay,String key,AssociationInput input){
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);key(key);var hash=hash(input);
        var replay=registrationReplay(guest,stay,c.propertyId(),key,hash);if(replay.isPresent())return new VehicleCreation(replay.get(),true);
        AmenitiesRequestService.eligible(c);
        // Verify owner before acquiring a lock on a supplied saved UUID.
        readSaved(input.savedVehicleId(),guest.guestAccountId(),false);var saved=readSaved(input.savedVehicleId(),guest.guestAccountId(),true);version(saved.updatedAt(),input.expectedVehicleUpdatedAt());
        if(!List.of("PARKED","WITH_GUEST").contains(input.location()))throw invalid();
        return new VehicleCreation(insertAssociation(guest,c,stay,saved.id(),input.location(),key,hash),false);
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public List<Vehicle> vehicles(GuestPrincipal p,UUID reservation,UUID stay){var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,false);
        return jdbc.sql("SELECT id FROM valet_vehicles WHERE guest_account_id=:account AND stay_id=:stay AND property_id=:property ORDER BY created_at,id").param("account",guest.guestAccountId()).param("stay",stay).param("property",c.propertyId()).query(UUID.class).list().stream().map(id->readVehicle(id,c.propertyId(),false)).toList();}
    public Vehicle editVehicle(GuestPrincipal p,UUID reservation,UUID stay,UUID id,VehicleEdit input){
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);AmenitiesRequestService.eligible(c);var old=ownedVehicle(guest,c,stay,id);
        if(old.hasActiveRequest())throw conflict();
        var v=normalized(new VehicleInput(input.make(),input.model(),input.platePrefix(),input.plateBody(),input.color(),old.location()));
        if(v.make().equals(old.make())&&v.model().equals(old.model())&&v.platePrefix().equals(old.platePrefix())&&v.plateBody().equals(old.plateBody())&&Objects.equals(v.color(),old.color()))return old;
        version(old.updatedAt(),input.expectedUpdatedAt());
        if(jdbc.sql("SELECT EXISTS(SELECT 1 FROM valet_requests WHERE saved_vehicle_id=:saved AND active)").param("saved",old.savedVehicleId()).query(Boolean.class).single())throw conflict();
        var saved=readSaved(old.savedVehicleId(),guest.guestAccountId(),false);
        jdbc.sql("UPDATE valet_saved_vehicles SET make=:make,model=:model,plate_prefix=:prefix,plate_body=:body,color=:color,updated_at=:now WHERE id=:id").param("id",saved.id()).param("make",v.make()).param("model",v.model()).param("prefix",v.platePrefix()).param("body",v.plateBody()).param("color",v.color()).param("now",java.sql.Timestamp.from(next(saved.updatedAt()))).update();
        jdbc.sql("UPDATE valet_vehicles SET make=:make,model=:model,plate_prefix=:prefix,plate_body=:body,color=:color,updated_at=:now WHERE id=:id")
            .param("id",id).param("make",v.make()).param("model",v.model()).param("prefix",v.platePrefix()).param("body",v.plateBody()).param("color",v.color()).param("now",java.sql.Timestamp.from(next(old.updatedAt()))).update();
        guestAudit(guest,c,id,"VALET_VEHICLE_EDITED",null,"{}");return readVehicle(id,c.propertyId(),false);
    }
    private static AmenitiesModels.OrderInput schedule(OrderInput input){if(input==null||input.vehicleId()==null)throw invalid();return new AmenitiesModels.OrderInput(input.serviceDate(),input.deliveryTime(),List.of(),null);}
    public Creation create(GuestPrincipal p,UUID reservation,UUID stay,String key,OrderInput input){
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);key(key);var hash=hash(input);
        var prior=jdbc.sql("SELECT id,initial_payload_hash FROM valet_requests WHERE guest_account_id=:account AND stay_id=:stay AND request_key=:key").param("account",guest.guestAccountId()).param("stay",stay).param("key",key).query((rs,n)->Map.entry(rs.getObject("id",UUID.class),rs.getString("initial_payload_hash"))).optional();
        if(prior.isPresent()){if(!hash.equals(prior.get().getValue()))throw conflict();return new Creation(read(prior.get().getKey(),c.propertyId()),true);}
        AmenitiesRequestService.validateSchedule(c,schedule(input),Instant.now(),1800);
        var v=ownedVehicle(guest,c,stay,input.vehicleId());if(v.hasActiveRequest()||!v.location().equals("PARKED"))throw conflict();
        var opened=operations.openRequest(new ServiceRequestService.OpenRequestCommand(c.propertyId(),Category.VALET,"Entrega de vehículo",null,Priority.MEDIUM,reservation,stay,c.roomId(),c.profileId(),null,AmenitiesRequestService.scheduledAt(c,schedule(input))));requests.flush();
        var snapshot=new Snapshot(v.make(),v.model(),v.platePrefix(),v.plateBody(),v.color());
        jdbc.sql("INSERT INTO valet_requests(id,vehicle_id,stay_id,property_id,guest_account_id,request_key,initial_payload_hash,current_payload_hash,service_date,delivery_time,vehicle_snapshot) VALUES (:id,:vehicle,:stay,:property,:account,:key,:hash,:hash,:date,:time,CAST(:snapshot AS jsonb))")
            .param("id",opened.id()).param("vehicle",v.id()).param("stay",stay).param("property",c.propertyId()).param("account",guest.guestAccountId()).param("key",key).param("hash",hash).param("date",input.serviceDate()).param("time",LocalTime.parse(input.deliveryTime())).param("snapshot",json.writeValueAsString(snapshot)).update();
        guestAudit(guest,c,opened.id(),"VALET_REQUESTED",null,json.writeValueAsString(Map.of("vehicleId",v.id(),"serviceDate",input.serviceDate(),"deliveryTime",input.deliveryTime())));return new Creation(read(opened.id(),c.propertyId()),false);
    }
    private UUID requestVehicle(UUID id,UUID property){return jdbc.sql("SELECT vehicle_id FROM valet_requests WHERE id=:id AND property_id=:property").param("id",id).param("property",property).query(UUID.class).optional().orElseThrow(ValetRequestService::unavailable);}
    private ServiceRequest owned(GuestPrincipal p,Context c,UUID reservation,UUID stay,UUID id){
        ownedVehicle(p,c,stay,requestVehicle(id,c.propertyId()));
        return requests.findByIdAndPropertyIdAndReservationIdAndStayIdAndCategory(id,c.propertyId(),reservation,stay,Category.VALET).orElseThrow(ValetRequestService::unavailable);
    }
    public Order edit(GuestPrincipal p,UUID reservation,UUID stay,UUID id,EditInput input){
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);var row=owned(guest,c,reservation,stay,id);AmenitiesRequestService.requireModifiable(c,row,Instant.now());
        var before=read(id,c.propertyId());var payload=new OrderInput(before.vehicleId(),input.serviceDate(),input.deliveryTime());var hash=hash(payload);
        if(hash.equals(jdbc.sql("SELECT current_payload_hash FROM valet_requests WHERE id=:id").param("id",id).query(String.class).single()))return before;
        version(row.getUpdatedAt(),input.expectedUpdatedAt());AmenitiesRequestService.validateSchedule(c,schedule(payload),Instant.now(),1800);
        row.scheduleFor(AmenitiesRequestService.scheduledAt(c,schedule(payload)),next(row.getUpdatedAt()));requests.saveAndFlush(row);entities.refresh(row);
        jdbc.sql("UPDATE valet_requests SET service_date=:date,delivery_time=:time,current_payload_hash=:hash WHERE id=:id").param("date",input.serviceDate()).param("time",LocalTime.parse(input.deliveryTime())).param("hash",hash).param("id",id).update();
        guestAudit(guest,c,id,"VALET_EDITED",json.writeValueAsString(Map.of("serviceDate",before.serviceDate(),"deliveryTime",before.deliveryTime())),json.writeValueAsString(Map.of("serviceDate",input.serviceDate(),"deliveryTime",input.deliveryTime())));return read(id,c.propertyId());
    }
    public Order cancel(GuestPrincipal p,UUID reservation,UUID stay,UUID id,Instant expected){
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);var row=owned(guest,c,reservation,stay,id);
        if(row.getStatus()==Status.CANCELLED)return read(id,c.propertyId());AmenitiesRequestService.requireModifiable(c,row,Instant.now());version(row.getUpdatedAt(),expected);
        row.cancel(next(row.getUpdatedAt()));requests.saveAndFlush(row);guestAudit(guest,c,id,"VALET_CANCELLED","{\"status\":\"OPEN\"}","{\"status\":\"CANCELLED\"}");return read(id,c.propertyId());
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public List<Order> list(GuestPrincipal p,UUID reservation,UUID stay){var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,false);
        return jdbc.sql("SELECT id FROM valet_requests WHERE property_id=:property AND guest_account_id=:account AND stay_id=:stay ORDER BY service_date,delivery_time,id").param("property",c.propertyId()).param("account",guest.guestAccountId()).param("stay",stay).query(UUID.class).list().stream().map(id->read(id,c.propertyId())).toList();}
    private Order read(UUID id,UUID property){
        return jdbc.sql("SELECT sr.*,o.vehicle_id,o.vehicle_snapshot,o.service_date order_date,o.delivery_time,r.confirmation_code,room.code room_code FROM valet_requests o JOIN service_requests sr ON sr.id=o.id AND sr.stay_id=o.stay_id AND sr.property_id=o.property_id JOIN reservations r ON r.id=sr.reservation_id AND r.property_id=sr.property_id LEFT JOIN rooms room ON room.id=sr.room_id AND room.property_id=sr.property_id WHERE sr.id=:id AND sr.property_id=:property AND sr.category='VALET'")
            .param("id",id).param("property",property).query((rs,n)->new Order(id,property,rs.getObject("reservation_id",UUID.class),rs.getObject("stay_id",UUID.class),rs.getString("confirmation_code"),rs.getString("room_code"),rs.getObject("vehicle_id",UUID.class),json.readValue(rs.getString("vehicle_snapshot"),Snapshot.class),rs.getObject("order_date",LocalDate.class),rs.getObject("delivery_time",LocalTime.class).toString(),Status.valueOf(rs.getString("status")),rs.getTimestamp("created_at").toInstant(),rs.getTimestamp("updated_at").toInstant(),rs.getTimestamp("due_at").toInstant().minusSeconds(1500))).optional().orElseThrow(ValetRequestService::unavailable);
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public List<Order> staffList(StaffPrincipal p,UUID property){staffAccess(p,property,false);return jdbc.sql("SELECT id FROM valet_requests WHERE property_id=:property ORDER BY service_date,delivery_time,id").param("property",property).query(UUID.class).list().stream().map(id->read(id,property)).toList();}
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public List<Vehicle> staffVehicles(StaffPrincipal p,UUID property){staffAccess(p,property,false);return jdbc.sql("SELECT id FROM valet_vehicles WHERE property_id=:property ORDER BY created_at,id").param("property",property).query(UUID.class).list().stream().map(id->readVehicle(id,property,false)).toList();}
    public Order staffTransition(StaffPrincipal p,UUID property,UUID id,Transition input){
        UUID actor=staffAccess(p,property,true);var vehicle=requestVehicle(id,property);lockForAssociation(vehicle,property);var v=readVehicle(vehicle,property,true);
        var row=requests.findByIdAndPropertyIdAndCategory(id,property,Category.VALET).orElseThrow(ValetRequestService::unavailable);var target=Status.valueOf(input.targetStatus());
        if(target!=Status.IN_PROGRESS&&target!=Status.DONE)throw invalid();if(row.getStatus()==target)return read(id,property);version(row.getUpdatedAt(),input.expectedUpdatedAt());
        if(!(row.getStatus()==Status.OPEN&&target==Status.IN_PROGRESS||row.getStatus()==Status.IN_PROGRESS&&target==Status.DONE)||!v.location().equals("PARKED"))throw conflict();
        if(target==Status.IN_PROGRESS)operations.startProgress(id,actor);else{operations.complete(id,actor);changeLocation(v,"WITH_GUEST",actor,"VALET_DELIVERED");}
        requests.flush();entities.refresh(row);return read(id,property);
    }
    public Vehicle staffReturn(StaffPrincipal p,UUID property,UUID id,Instant expected){
        UUID actor=staffAccess(p,property,true);lockForAssociation(id,property);var v=readVehicle(id,property,true);
        // Replay only of this return. A stale return must never affect a later custody cycle.
        if(v.location().equals("PARKED")&&jdbc.sql("SELECT return_expected_version FROM valet_vehicles WHERE id=:id").param("id",id).query(java.sql.Timestamp.class).optional().map(t->t.toInstant().equals(expected)).orElse(false))return v;
        version(v.updatedAt(),expected);if(occupied(v.savedVehicleId(),v.id()))throw conflict();if(v.hasActiveRequest()||!v.location().equals("WITH_GUEST"))throw conflict();changeLocation(v,"PARKED",actor,"VALET_RETURNED");return readVehicle(id,property,false);
    }
    public Vehicle exceptionalDelivery(StaffPrincipal p,UUID property,UUID id,Instant expected){
        var actor=staffAccess(p,property,true);lockForAssociation(id,property);var v=readVehicle(id,property,true);
        if(v.location().equals("WITH_GUEST")&&jdbc.sql("SELECT release_expected_version FROM valet_vehicles WHERE id=:id").param("id",id).query(java.sql.Timestamp.class).optional().map(t->t.toInstant().equals(expected)).orElse(false))return v;
        version(v.updatedAt(),expected);if(!v.canRelease())throw conflict();
        changeLocation(v,"WITH_GUEST",actor,"VALET_EXCEPTIONAL_DELIVERY");return readVehicle(id,property,false);
    }
    private void changeLocation(Vehicle v,String target,UUID actor,String action){
        jdbc.sql("UPDATE valet_vehicles SET location=:location,updated_at=:now,return_expected_version=:returnVersion,release_expected_version=:releaseVersion WHERE id=:id").param("location",target).param("returnVersion",target.equals("PARKED")?java.sql.Timestamp.from(v.updatedAt()):null).param("releaseVersion",action.equals("VALET_EXCEPTIONAL_DELIVERY")?java.sql.Timestamp.from(v.updatedAt()):null).param("now",java.sql.Timestamp.from(next(v.updatedAt()))).param("id",v.id()).update();
        audit.record(new AuditService.RecordAuditCommand(ActorType.STAFF,actor,action,"VALET_VEHICLE",v.id(),v.propertyId(),json.writeValueAsString(Map.of("location",v.location())),json.writeValueAsString(Map.of("location",target,"savedVehicleId",v.savedVehicleId(),"stayId",v.stayId(),"propertyId",v.propertyId(),"confirmedAt",Instant.now())),null,null));
    }
    private UUID staffAccess(StaffPrincipal p,UUID property,boolean manage) {
        if(p==null)throw new StaffAuthenticationException();var active=staffSessions.getActivePrincipal(p);var permissions=staffAuthorization.resolve(active.staffUserId());
        if(manage?!permissions.hasPermission("OPERATIONS_MANAGE"):!permissions.hasPermission("OPERATIONS_MANAGE")&&!permissions.hasPermission("SERVICE_REQUEST_INTAKE"))throw new AccessDeniedException("Valet access denied");
        scopes.resolveProperty(permissions,property);return active.staffUserId();
    }
    private void guestAudit(GuestPrincipal p,Context c,UUID id,String action,String before,String after) { audit.record(new AuditService.RecordAuditCommand(ActorType.GUEST,p.guestAccountId(),action,action.equals("VALET_VEHICLE_REGISTERED")?"VALET_SAVED_VEHICLE":action.startsWith("VALET_VEHICLE_")?"VALET_VEHICLE":"SERVICE_REQUEST",id,c.propertyId(),before,after,null,null)); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT,"Order changed, stay ineligible or modification cutoff reached"); }
    private static ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Order unavailable"); }
}
