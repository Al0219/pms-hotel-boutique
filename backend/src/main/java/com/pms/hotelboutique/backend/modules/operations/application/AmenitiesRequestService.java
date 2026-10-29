package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.*;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.ServiceRequestRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.operations.application.GuestServiceContext.Context;
import static com.pms.hotelboutique.backend.modules.operations.application.AmenitiesModels.*;
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

/** Persisted amenities use the existing ServiceRequest lifecycle, Guest boundary and Staff permissions. */
@Service
@Transactional
public class AmenitiesRequestService {
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
    public AmenitiesRequestService(GuestAuthService auth,GuestServiceContext contexts,JdbcClient jdbc,ServiceRequestService operations,
            ServiceRequestRepository requests,AuditService audit,EntityManager entities,StaffAuthService staffSessions,
            StaffAuthorizationService staffAuthorization,PropertyScopeResolver scopes,ObjectMapper json) {
        this.auth=auth;this.contexts=contexts;this.jdbc=jdbc;this.operations=operations;this.requests=requests;this.audit=audit;
        this.entities=entities;this.staffSessions=staffSessions;this.staffAuthorization=staffAuthorization;this.scopes=scopes;this.json=json;
    }
    private GuestPrincipal active(GuestPrincipal p) { if(p==null)throw new GuestAuthenticationException();return auth.getActivePrincipal(p); }
    @Transactional(readOnly=true)
    public List<Product> catalog(GuestPrincipal p,UUID reservation,UUID stay) {
        var c=contexts.load(active(p).guestAccountId(),reservation,stay,false);return products(c.propertyId(),false);
    }
    private List<Product> products(UUID property,boolean lock) {
        return jdbc.sql("SELECT id,code,name FROM amenities_catalog WHERE property_id=:property ORDER BY display_order,code"+(lock?" FOR SHARE":""))
            .param("property",property).query((rs,n)->new Product(rs.getObject("id",UUID.class),rs.getString("code"),rs.getString("name"))).list();
    }

    public Creation create(GuestPrincipal p,UUID reservation,UUID stay,String key,OrderInput input) {
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);
        if(key==null||!key.matches("[A-Za-z0-9-]{16,100}"))throw invalid();
        var payload=normalize(input);String hash=fingerprint(payload);
        var prior=jdbc.sql("SELECT id,initial_payload_hash FROM amenities_requests WHERE stay_id=:stay AND request_key=:key")
            .param("stay",stay).param("key",key).query((rs,n)->Map.entry(rs.getObject("id",UUID.class),rs.getString("initial_payload_hash"))).optional();
        if(prior.isPresent()) {
            if(!hash.equals(prior.get().getValue()))throw conflict();
            return new Creation(read(prior.get().getKey(),c.propertyId()),true);
        }
        validateSchedule(c,payload,Instant.now(),1800);
        var lines=resolveLines(c,payload,List.of());
        var opened=operations.openRequest(new ServiceRequestService.OpenRequestCommand(c.propertyId(),Category.AMENITIES,"Amenidades",payload.notes(),Priority.MEDIUM,reservation,stay,c.roomId(),c.profileId(),null,scheduledAt(c,payload)));
        requests.flush();
        jdbc.sql("INSERT INTO amenities_requests(id,stay_id,request_key,initial_payload_hash,current_payload_hash,service_date,delivery_time) VALUES (:id,:stay,:key,:hash,:hash,:date,:time)")
            .param("id",opened.id()).param("stay",stay).param("key",key).param("hash",hash).param("date",payload.serviceDate()).param("time",LocalTime.parse(payload.deliveryTime())).update();
        saveLines(opened.id(),lines);guestAudit(guest,c,opened.id(),"AMENITIES_REQUESTED",null,auditState(payload,lines));
        return new Creation(read(opened.id(),c.propertyId()),false);
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public List<Order> list(GuestPrincipal p,UUID reservation,UUID stay) {
        var c=contexts.load(active(p).guestAccountId(),reservation,stay,false);
        return ids("sr.property_id=:property AND sr.reservation_id=:reservation AND sr.stay_id=:stay",c.propertyId(),reservation,stay).stream().map(id->read(id,c.propertyId())).toList();
    }
    public Order edit(GuestPrincipal p,UUID reservation,UUID stay,UUID id,EditInput input) {
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);var row=owned(c,reservation,stay,id);
        requireModifiable(c,row,Instant.now());var payload=normalize(input.order());String hash=fingerprint(payload);
        String previous=jdbc.sql("SELECT current_payload_hash FROM amenities_requests WHERE id=:id").param("id",id).query(String.class).single();
        if(hash.equals(previous))return read(id,c.propertyId());
        version(row,input.expectedUpdatedAt());var before=read(id,c.propertyId());
        boolean sameSchedule=payload.serviceDate().equals(before.serviceDate())&&payload.deliveryTime().equals(before.deliveryTime());
        validateSchedule(c,payload,Instant.now(),sameSchedule?1500:1800);
        var lines=resolveLines(c,payload,before.items());
        row.describe(payload.notes(),row.getPriority());row.scheduleFor(scheduledAt(c,payload),nextTimestamp(row));requests.saveAndFlush(row);entities.refresh(row);
        jdbc.sql("UPDATE amenities_requests SET service_date=:date,delivery_time=:time,current_payload_hash=:hash WHERE id=:id")
            .param("date",payload.serviceDate()).param("time",LocalTime.parse(payload.deliveryTime())).param("hash",hash).param("id",id).update();
        jdbc.sql("DELETE FROM amenities_request_lines WHERE request_id=:id").param("id",id).update();saveLines(id,lines);
        guestAudit(guest,c,id,"AMENITIES_EDITED",auditState(new OrderInput(before.serviceDate(),before.deliveryTime(),List.of(),null),before.items()),auditState(payload,lines));return read(id,c.propertyId());
    }
    public Order cancel(GuestPrincipal p,UUID reservation,UUID stay,UUID id,Instant expected) {
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);var row=owned(c,reservation,stay,id);
        if(row.getStatus()==Status.CANCELLED)return read(id,c.propertyId());
        requireModifiable(c,row,Instant.now());version(row,expected);row.cancel(nextTimestamp(row));requests.saveAndFlush(row);
        guestAudit(guest,c,id,"AMENITIES_CANCELLED","{\"status\":\"OPEN\"}","{\"status\":\"CANCELLED\"}");return read(id,c.propertyId());
    }
    private ServiceRequest owned(Context c,UUID reservation,UUID stay,UUID id) {
        return requests.findByIdAndPropertyIdAndReservationIdAndStayIdAndCategory(id,c.propertyId(),reservation,stay,Category.AMENITIES).orElseThrow(AmenitiesRequestService::unavailable);
    }
    static void requireModifiable(Context c,ServiceRequest row,Instant now) {
        eligible(c);
        if(row.getStatus()!=Status.OPEN||row.getDueAt()==null||!now.isBefore(row.getDueAt().minusSeconds(1500)))throw conflict();
    }
    private List<Line> resolveLines(Context c,OrderInput payload,List<Line> previous) {
        var catalog=new HashMap<UUID,Product>();for(var p:products(c.propertyId(),true))catalog.put(p.id(),p);
        var old=new HashMap<UUID,Line>();for(var line:previous)old.put(line.itemId(),line);
        return payload.items().stream().map(input->{
            var product=catalog.get(input.itemId());if(product==null)throw invalid();
            var saved=old.get(product.id());
            return new Line(product.id(),saved==null?product.name():saved.itemName(),input.quantity());
        }).toList();
    }
    private String auditState(OrderInput input,List<Line> lines) {
        return json.writeValueAsString(Map.of("serviceDate",input.serviceDate(),"deliveryTime",input.deliveryTime(),"items",lines));
    }
    static void eligible(Context c) {
        if(!"CONFIRMED".equals(c.reservationStatus())||!("IN_HOUSE".equals(c.status())||"RESERVED".equals(c.status())))throw conflict();
    }
    static Instant scheduledAt(Context c,OrderInput input) {
        var local=input.serviceDate().atTime(LocalTime.parse(input.deliveryTime()));
        var zone=ZoneId.of(c.timezone());
        // Fail closed for nonexistent or ambiguous wall-clock times in DST properties.
        if(zone.getRules().getValidOffsets(local).size()!=1)throw invalid();
        return local.atZone(zone).toInstant();
    }
    static void validateSchedule(Context c,OrderInput input,Instant now,int leadSeconds) {
        eligible(c);var date=input.serviceDate();var instant=scheduledAt(c,input);
        var checkout=c.departure().atTime(12,0).atZone(ZoneId.of(c.timezone())).toInstant();
        if(date.isBefore(c.arrival())||date.isAfter(c.departure())||instant.isBefore(now.plusSeconds(leadSeconds))||instant.isAfter(checkout))throw invalid();
    }
    static OrderInput normalize(OrderInput input) {
        if(input==null||input.serviceDate()==null||input.deliveryTime()==null||!input.deliveryTime().matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]")||input.items()==null||input.items().isEmpty()||input.items().size()>5)throw invalid();
        String notes=input.notes()==null||input.notes().isBlank()?null:input.notes().trim();if(notes!=null&&notes.length()>500)throw invalid();
        var ids=new HashSet<UUID>();for(var line:input.items())if(line==null||line.itemId()==null||line.quantity()<1||line.quantity()>5||!ids.add(line.itemId()))throw invalid();
        return new OrderInput(input.serviceDate(),input.deliveryTime(),input.items().stream().sorted(Comparator.comparing(line->line.itemId().toString())).toList(),notes);
    }
    private String fingerprint(OrderInput input) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsString(input).getBytes(StandardCharsets.UTF_8))); }
        catch(Exception e) { throw new IllegalStateException("Cannot fingerprint amenities request",e); }
    }
    private void saveLines(UUID id,List<Line> lines) {
        for(var line:lines)jdbc.sql("INSERT INTO amenities_request_lines(request_id,item_id,item_name,quantity) VALUES (:id,:item,:name,:quantity)")
            .param("id",id).param("item",line.itemId()).param("name",line.itemName()).param("quantity",line.quantity()).update();
    }
    private Order read(UUID id,UUID property) {
        var lines=jdbc.sql("SELECT * FROM amenities_request_lines WHERE request_id=:id ORDER BY item_id").param("id",id)
            .query((rs,n)->new Line(rs.getObject("item_id",UUID.class),rs.getString("item_name"),rs.getInt("quantity"))).list();
        return jdbc.sql("""
            SELECT sr.*,o.service_date order_date,o.delivery_time,r.confirmation_code,room.code room_code
            FROM service_requests sr JOIN amenities_requests o ON o.id=sr.id AND o.stay_id=sr.stay_id
            JOIN reservations r ON r.id=sr.reservation_id AND r.property_id=sr.property_id
            JOIN reservation_stays s ON s.id=sr.stay_id AND s.reservation_id=r.id AND s.property_id=sr.property_id
            LEFT JOIN rooms room ON room.id=sr.room_id AND room.property_id=sr.property_id
            WHERE sr.id=:id AND sr.property_id=:property AND sr.category='AMENITIES'
            """).param("id",id).param("property",property).query((rs,n)->new Order(id,rs.getObject("reservation_id",UUID.class),rs.getObject("stay_id",UUID.class),property,
                rs.getString("confirmation_code"),rs.getString("room_code"),rs.getObject("order_date",LocalDate.class),rs.getObject("delivery_time",LocalTime.class).toString(),rs.getString("detail"),
                Status.valueOf(rs.getString("status")),rs.getTimestamp("created_at").toInstant(),rs.getTimestamp("updated_at").toInstant(),rs.getTimestamp("due_at").toInstant().minusSeconds(1500),lines)).optional().orElseThrow(AmenitiesRequestService::unavailable);
    }
    private List<UUID> ids(String filter,UUID property,UUID reservation,UUID stay) {
        var sql=jdbc.sql("SELECT sr.id FROM service_requests sr JOIN amenities_requests o ON o.id=sr.id WHERE "+filter+" AND sr.category='AMENITIES' ORDER BY sr.created_at DESC,sr.id").param("property",property);
        if(reservation!=null)sql.param("reservation",reservation).param("stay",stay);
        return sql.query(UUID.class).list();
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public List<Order> staffList(StaffPrincipal p,UUID property) { staffAccess(p,property,false);return ids("sr.property_id=:property",property,null,null).stream().map(id->read(id,property)).toList(); }
    public Order staffTransition(StaffPrincipal p,UUID property,UUID id,Transition input) {
        UUID actor=staffAccess(p,property,true);
        var row=requests.findByIdAndPropertyIdAndCategory(id,property,Category.AMENITIES).orElseThrow(AmenitiesRequestService::unavailable);
        var target=Status.valueOf(input.targetStatus());if(target!=Status.IN_PROGRESS&&target!=Status.DONE)throw invalid();
        read(id,property);if(row.getStatus()==target)return read(id,property);
        version(row,input.expectedUpdatedAt());
        if(!(row.getStatus()==Status.OPEN&&target==Status.IN_PROGRESS||row.getStatus()==Status.IN_PROGRESS&&target==Status.DONE))throw conflict();
        if(target==Status.IN_PROGRESS)operations.startProgress(id,actor);else operations.complete(id,actor);
        requests.flush();entities.refresh(row);return read(id,property);
    }
    private UUID staffAccess(StaffPrincipal p,UUID property,boolean manage) {
        if(p==null)throw new StaffAuthenticationException();var active=staffSessions.getActivePrincipal(p);var permissions=staffAuthorization.resolve(active.staffUserId());
        if(manage?!permissions.hasPermission("OPERATIONS_MANAGE"):!permissions.hasPermission("OPERATIONS_MANAGE")&&!permissions.hasPermission("SERVICE_REQUEST_INTAKE"))throw new AccessDeniedException("Amenidades access denied");
        scopes.resolveProperty(permissions,property);return active.staffUserId();
    }
    private void guestAudit(GuestPrincipal p,Context c,UUID id,String action,String before,String after) { audit.record(new AuditService.RecordAuditCommand(ActorType.GUEST,p.guestAccountId(),action,"SERVICE_REQUEST",id,c.propertyId(),before,after,null,null)); }
    private static Instant nextTimestamp(ServiceRequest row) { var now=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);return now.isAfter(row.getUpdatedAt())?now:row.getUpdatedAt().plusNanos(1000); }
    private static void version(ServiceRequest row,Instant expected) { if(expected==null||!expected.equals(row.getUpdatedAt()))throw conflict(); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT,"Order changed, stay ineligible or modification cutoff reached"); }
    private static ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Order unavailable"); }
}
