package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.*;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.ServiceRequestRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.operations.application.GuestServiceContext.Context;
import com.pms.hotelboutique.backend.modules.operations.application.RoomServiceModels.Period;
import static com.pms.hotelboutique.backend.modules.operations.application.RoomServiceModels.*;
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
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

/** Persistent Room Service facade. Existing ServiceRequest owns lifecycle/context/audit; no folio or payment writes. */
@Service
@Transactional
public class RoomServiceRequestService {
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
    public RoomServiceRequestService(GuestAuthService auth,GuestServiceContext contexts,JdbcClient jdbc,ServiceRequestService operations,
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
        return jdbc.sql("SELECT id,code,name,periods,unit_price_minor,currency,available FROM room_service_products WHERE property_id=:property ORDER BY code"+(lock?" FOR SHARE":""))
            .param("property",property).query((rs,n)->new Product(rs.getObject("id",UUID.class),rs.getString("code"),rs.getString("name"),
                Arrays.stream((String[])rs.getArray("periods").getArray()).map(Period::valueOf).toList(),rs.getLong("unit_price_minor"),rs.getString("currency"),rs.getBoolean("available"))).list();
    }
    public Creation create(GuestPrincipal p,UUID reservation,UUID stay,String key,OrderInput input) {
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);
        if(key==null||!key.matches("[A-Za-z0-9-]{16,100}"))throw invalid();
        var payload=normalize(input);String hash=fingerprint(payload);
        var prior=jdbc.sql("SELECT id,initial_payload_hash FROM room_service_orders WHERE stay_id=:stay AND request_key=:key")
            .param("stay",stay).param("key",key).query((rs,n)->Map.entry(rs.getObject("id",UUID.class),rs.getString("initial_payload_hash"))).optional();
        if(prior.isPresent()) {
            if(!hash.equals(prior.get().getValue()))throw conflict();
            return new Creation(read(prior.get().getKey(),c.propertyId()),true);
        }
        validateSchedule(c,payload,Instant.now(),1800);
        var lines=price(c,payload,List.of());long total=total(lines);
        var opened=operations.openRequest(new ServiceRequestService.OpenRequestCommand(c.propertyId(),Category.ROOM_SERVICE,"Room Service",payload.notes(),Priority.MEDIUM,reservation,stay,c.roomId(),c.profileId(),null,scheduledAt(c,payload)));
        requests.flush();
        jdbc.sql("INSERT INTO room_service_orders(id,stay_id,request_key,initial_payload_hash,current_payload_hash,service_date,delivery_time,currency,total_minor) VALUES (:id,:stay,:key,:hash,:hash,:date,:time,'GTQ',:total)")
            .param("id",opened.id()).param("stay",stay).param("key",key).param("hash",hash).param("date",payload.serviceDate()).param("time",LocalTime.parse(payload.deliveryTime())).param("total",total).update();
        saveLines(opened.id(),lines);guestAudit(guest,c,opened.id(),"ROOM_SERVICE_REQUESTED",null,"{\"status\":\"OPEN\",\"totalMinor\":"+total+"}");
        return new Creation(read(opened.id(),c.propertyId()),false);
    }
    @Transactional(readOnly=true)
    public List<Order> list(GuestPrincipal p,UUID reservation,UUID stay) {
        var c=contexts.load(active(p).guestAccountId(),reservation,stay,false);
        return ids("sr.property_id=:property AND sr.reservation_id=:reservation AND sr.stay_id=:stay",c.propertyId(),reservation,stay).stream().map(id->read(id,c.propertyId())).toList();
    }
    public Order edit(GuestPrincipal p,UUID reservation,UUID stay,UUID id,EditInput input) {
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);var row=owned(c,reservation,stay,id);
        requireModifiable(c,row,Instant.now());var payload=normalize(input.order());String hash=fingerprint(payload);
        String previous=jdbc.sql("SELECT current_payload_hash FROM room_service_orders WHERE id=:id").param("id",id).query(String.class).single();
        if(hash.equals(previous))return read(id,c.propertyId());
        version(row,input.expectedUpdatedAt());var before=read(id,c.propertyId());
        boolean sameSchedule=payload.serviceDate().equals(before.serviceDate())&&payload.deliveryTime().equals(before.deliveryTime());
        validateSchedule(c,payload,Instant.now(),sameSchedule?1500:1800);
        var lines=price(c,payload,before.items());long total=total(lines);
        row.describe(payload.notes(),row.getPriority());row.scheduleFor(scheduledAt(c,payload),nextTimestamp(row));requests.saveAndFlush(row);entities.refresh(row);
        jdbc.sql("UPDATE room_service_orders SET service_date=:date,delivery_time=:time,total_minor=:total,current_payload_hash=:hash WHERE id=:id")
            .param("date",payload.serviceDate()).param("time",LocalTime.parse(payload.deliveryTime())).param("total",total).param("hash",hash).param("id",id).update();
        jdbc.sql("DELETE FROM room_service_order_lines WHERE order_id=:id").param("id",id).update();saveLines(id,lines);
        guestAudit(guest,c,id,"ROOM_SERVICE_EDITED","{\"totalMinor\":"+before.totalMinor()+"}","{\"totalMinor\":"+total+",\"serviceDate\":\""+payload.serviceDate()+"\",\"deliveryTime\":\""+payload.deliveryTime()+"\"}");return read(id,c.propertyId());
    }
    public Order cancel(GuestPrincipal p,UUID reservation,UUID stay,UUID id,Instant expected) {
        var guest=active(p);var c=contexts.load(guest.guestAccountId(),reservation,stay,true);var row=owned(c,reservation,stay,id);
        if(row.getStatus()==Status.CANCELLED)return read(id,c.propertyId());
        requireModifiable(c,row,Instant.now());version(row,expected);row.cancel(nextTimestamp(row));requests.saveAndFlush(row);
        guestAudit(guest,c,id,"ROOM_SERVICE_CANCELLED","{\"status\":\"OPEN\"}","{\"status\":\"CANCELLED\"}");return read(id,c.propertyId());
    }
    private ServiceRequest owned(Context c,UUID reservation,UUID stay,UUID id) {
        return requests.findByIdAndPropertyIdAndReservationIdAndStayIdAndCategory(id,c.propertyId(),reservation,stay,Category.ROOM_SERVICE).orElseThrow(RoomServiceRequestService::unavailable);
    }
    static void requireModifiable(Context c,ServiceRequest row,Instant now) {
        eligible(c);
        if(row.getStatus()!=Status.OPEN||row.getDueAt()==null||!now.isBefore(row.getDueAt().minusSeconds(1500)))throw conflict();
    }
    private List<Line> price(Context c,OrderInput payload,List<Line> previous) {
        var catalog=new HashMap<UUID,Product>();for(var p:products(c.propertyId(),true))catalog.put(p.id(),p);
        var old=new HashMap<UUID,Line>();for(var line:previous)old.put(line.productId(),line);
        return payload.items().stream().map(input->{
            var product=catalog.get(input.productId());if(product==null||!product.available()||!product.periods().contains(input.mealPeriod()))throw invalid();
            var saved=old.get(product.id());long price=saved==null?product.unitPriceMinor():saved.unitPriceMinor();
            return new Line(product.id(),saved==null?product.name():saved.productName(),input.mealPeriod(),input.quantity(),price,Math.multiplyExact(price,input.quantity()));
        }).toList();
    }
    private static long total(List<Line> lines) { long result=0;for(var line:lines)result=Math.addExact(result,line.lineTotalMinor());return result; }
    static void eligible(Context c) {
        if(!"CONFIRMED".equals(c.reservationStatus())||!("IN_HOUSE".equals(c.status())||"RESERVED".equals(c.status())))throw conflict();
    }
    static Instant scheduledAt(Context c,OrderInput input) { return input.serviceDate().atTime(LocalTime.parse(input.deliveryTime())).atZone(ZoneId.of(c.timezone())).toInstant(); }
    static void validateSchedule(Context c,OrderInput input,Instant now,int leadSeconds) {
        eligible(c);var date=input.serviceDate();var time=LocalTime.parse(input.deliveryTime());var instant=scheduledAt(c,input);
        var checkout=c.departure().atTime(12,0).atZone(ZoneId.of(c.timezone())).toInstant();
        if(date.isBefore(c.arrival())||date.isAfter(c.departure())||instant.isBefore(now.plusSeconds(leadSeconds))||instant.isAfter(checkout))throw invalid();
        for(var item:input.items()) {
            Period period=item.mealPeriod();
            if(date.equals(c.departure())&&(period==Period.LUNCH||period==Period.DINNER))throw invalid(); // No persisted/approved late checkout in this MVP.
            boolean allowed=switch(period) {
                case BREAKFAST -> !time.isBefore(LocalTime.of(6,30))&&time.isBefore(LocalTime.of(11,30));
                case LUNCH -> !time.isBefore(LocalTime.of(11,30))&&time.isBefore(LocalTime.of(17,0));
                case DINNER -> !time.isBefore(LocalTime.of(17,0))&&time.isBefore(LocalTime.of(22,0));
                case BEVERAGES -> !time.isBefore(LocalTime.of(6,30))&&!time.isAfter(LocalTime.of(23,0));
            };
            if(!allowed)throw invalid();
        }
    }
    static OrderInput normalize(OrderInput input) {
        if(input==null||input.serviceDate()==null||input.deliveryTime()==null||!input.deliveryTime().matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]")||input.items()==null||input.items().isEmpty()||input.items().size()>6)throw invalid();
        String notes=input.notes()==null||input.notes().isBlank()?null:input.notes().trim();if(notes!=null&&notes.length()>500)throw invalid();
        var ids=new HashSet<UUID>();for(var line:input.items())if(line==null||line.productId()==null||line.mealPeriod()==null||line.quantity()<1||line.quantity()>5||!ids.add(line.productId()))throw invalid();
        return new OrderInput(input.serviceDate(),input.deliveryTime(),input.items().stream().sorted(Comparator.comparing(line->line.productId().toString())).toList(),notes);
    }
    private String fingerprint(OrderInput input) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsString(input).getBytes(StandardCharsets.UTF_8))); }
        catch(Exception e) { throw new IllegalStateException("Cannot fingerprint room service order",e); }
    }
    private void saveLines(UUID id,List<Line> lines) {
        for(var line:lines)jdbc.sql("INSERT INTO room_service_order_lines(order_id,product_id,product_name,meal_period,quantity,unit_price_minor,line_total_minor) VALUES (:id,:product,:name,:period,:quantity,:price,:total)")
            .param("id",id).param("product",line.productId()).param("name",line.productName()).param("period",line.mealPeriod().name()).param("quantity",line.quantity()).param("price",line.unitPriceMinor()).param("total",line.lineTotalMinor()).update();
    }
    private Order read(UUID id,UUID property) {
        var lines=jdbc.sql("SELECT * FROM room_service_order_lines WHERE order_id=:id ORDER BY product_id").param("id",id)
            .query((rs,n)->new Line(rs.getObject("product_id",UUID.class),rs.getString("product_name"),Period.valueOf(rs.getString("meal_period")),rs.getInt("quantity"),rs.getLong("unit_price_minor"),rs.getLong("line_total_minor"))).list();
        return jdbc.sql("""
            SELECT sr.*,o.service_date order_date,o.delivery_time,o.currency,o.total_minor,r.confirmation_code,room.code room_code
            FROM service_requests sr JOIN room_service_orders o ON o.id=sr.id AND o.stay_id=sr.stay_id
            JOIN reservations r ON r.id=sr.reservation_id AND r.property_id=sr.property_id
            JOIN reservation_stays s ON s.id=sr.stay_id AND s.reservation_id=r.id AND s.property_id=sr.property_id
            LEFT JOIN rooms room ON room.id=sr.room_id AND room.property_id=sr.property_id
            WHERE sr.id=:id AND sr.property_id=:property AND sr.category='ROOM_SERVICE'
            """).param("id",id).param("property",property).query((rs,n)->new Order(id,rs.getObject("reservation_id",UUID.class),rs.getObject("stay_id",UUID.class),property,
                rs.getString("confirmation_code"),rs.getString("room_code"),rs.getObject("order_date",LocalDate.class),rs.getObject("delivery_time",LocalTime.class).toString(),rs.getString("currency"),rs.getLong("total_minor"),rs.getString("detail"),
                Status.valueOf(rs.getString("status")),rs.getTimestamp("created_at").toInstant(),rs.getTimestamp("updated_at").toInstant(),rs.getTimestamp("due_at").toInstant().minusSeconds(1500),lines)).optional().orElseThrow(RoomServiceRequestService::unavailable);
    }
    private List<UUID> ids(String filter,UUID property,UUID reservation,UUID stay) {
        var sql=jdbc.sql("SELECT sr.id FROM service_requests sr JOIN room_service_orders o ON o.id=sr.id WHERE "+filter+" AND sr.category='ROOM_SERVICE' ORDER BY sr.created_at DESC,sr.id").param("property",property);
        if(reservation!=null)sql.param("reservation",reservation).param("stay",stay);
        return sql.query(UUID.class).list();
    }
    @Transactional(readOnly=true)
    public List<Order> staffList(StaffPrincipal p,UUID property) { staffAccess(p,property,false);return ids("sr.property_id=:property",property,null,null).stream().map(id->read(id,property)).toList(); }
    public Order staffTransition(StaffPrincipal p,UUID property,UUID id,Transition input) {
        UUID actor=staffAccess(p,property,true);
        var row=requests.findByIdAndPropertyIdAndCategory(id,property,Category.ROOM_SERVICE).orElseThrow(RoomServiceRequestService::unavailable);
        var target=Status.valueOf(input.targetStatus());if(target!=Status.IN_PROGRESS&&target!=Status.DONE)throw invalid();
        read(id,property);if(row.getStatus()==target)return read(id,property);
        version(row,input.expectedUpdatedAt());
        if(!(row.getStatus()==Status.OPEN&&target==Status.IN_PROGRESS||row.getStatus()==Status.IN_PROGRESS&&target==Status.DONE))throw conflict();
        if(target==Status.IN_PROGRESS)operations.startProgress(id,actor);else operations.complete(id,actor);
        requests.flush();entities.refresh(row);return read(id,property);
    }
    private UUID staffAccess(StaffPrincipal p,UUID property,boolean manage) {
        if(p==null)throw new StaffAuthenticationException();var active=staffSessions.getActivePrincipal(p);var permissions=staffAuthorization.resolve(active.staffUserId());
        if(manage?!permissions.hasPermission("OPERATIONS_MANAGE"):!permissions.hasPermission("OPERATIONS_MANAGE")&&!permissions.hasPermission("SERVICE_REQUEST_INTAKE"))throw new AccessDeniedException("Room Service access denied");
        scopes.resolveProperty(permissions,property);return active.staffUserId();
    }
    private void guestAudit(GuestPrincipal p,Context c,UUID id,String action,String before,String after) { audit.record(new AuditService.RecordAuditCommand(ActorType.GUEST,p.guestAccountId(),action,"SERVICE_REQUEST",id,c.propertyId(),before,after,null,null)); }
    private static Instant nextTimestamp(ServiceRequest row) { var now=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);return now.isAfter(row.getUpdatedAt())?now:row.getUpdatedAt().plusNanos(1000); }
    private static void version(ServiceRequest row,Instant expected) { if(expected==null||!expected.equals(row.getUpdatedAt()))throw conflict(); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT,"Order changed, stay ineligible or modification cutoff reached"); }
    private static ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"Order unavailable"); }
}
