package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import com.pms.hotelboutique.backend.modules.operations.application.GuestServiceContext;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType;
import com.pms.hotelboutique.backend.shared.money.*;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.AccessDeniedException;
import jakarta.persistence.EntityManager;
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional
public class StayJourneyService {
    private final JdbcClient jdbc; private final GuestAuthService guests; private final GuestServiceContext contexts;
    private final StaffAuthService staff; private final StaffAuthorizationService permissions; private final PropertyScopeResolver scopes;
    private final FolioService folios; private final RoomServiceBillingService billing; private final AuditService audit;
    private final ObjectMapper json; private final EntityManager entities;
    public StayJourneyService(JdbcClient jdbc,GuestAuthService guests,GuestServiceContext contexts,StaffAuthService staff,
            StaffAuthorizationService permissions,PropertyScopeResolver scopes,FolioService folios,RoomServiceBillingService billing,AuditService audit,ObjectMapper json,EntityManager entities){
        this.jdbc=jdbc;this.guests=guests;this.contexts=contexts;this.staff=staff;this.permissions=permissions;this.scopes=scopes;
        this.folios=folios;this.billing=billing;this.audit=audit;this.json=json;this.entities=entities;
    }
    @io.swagger.v3.oas.annotations.media.Schema(name="StayJourneyStay")
    public record Stay(UUID propertyId,UUID reservationId,UUID stayId,String confirmationCode,String status,Instant updatedAt,UUID roomId,LocalDate arrival,LocalDate departure,String timezone){}
    @io.swagger.v3.oas.annotations.media.Schema(name="StayJourneyRequest")
    public record Request(UUID id,String kind,String status,Instant createdAt,Instant completedAt){}
    @io.swagger.v3.oas.annotations.media.Schema(name="StayJourneyLine")
    public record Line(UUID id,String kind,@io.swagger.v3.oas.annotations.media.Schema(description="Ledger description; Room Service uses the persisted order service date and delivery time when linked. Issued document snapshots remain immutable.") String description,String amount,Instant createdAt){}
    @io.swagger.v3.oas.annotations.media.Schema(name="StayJourneyDocument")
    public record Document(UUID id,Instant issuedAt,Summary snapshot){}
    @io.swagger.v3.oas.annotations.media.Schema(name="StayJourneySummary")
    public record Estimate(UUID id,String description,String amount){}
    public record Summary(Stay stay,UUID folioId,String currency,String balance,String charges,String payments,String adjustments,boolean verifiable,int pendingOrders,int unpostedOrders,List<Line> movements,List<Request> requests,UUID documentId,String disclaimer,List<Estimate> estimatedTransfers){
        public Summary(Stay stay,UUID folioId,String currency,String balance,String charges,String payments,String adjustments,boolean verifiable,int pendingOrders,int unpostedOrders,List<Line> movements,List<Request> requests,UUID documentId,String disclaimer){this(stay,folioId,currency,balance,charges,payments,adjustments,verifiable,pendingOrders,unpostedOrders,movements,requests,documentId,disclaimer,List.of());}
    }
    @io.swagger.v3.oas.annotations.media.Schema(additionalProperties=io.swagger.v3.oas.annotations.media.Schema.AdditionalPropertiesValue.FALSE)
    public record PaymentInput(String amount,String currency,String instrumentToken){
        @com.fasterxml.jackson.annotation.JsonAnySetter public void reject(String k,Object v){throw new IllegalArgumentException("Unknown payment field");}
        @Override public String toString(){return "PaymentInput[redacted]";}
    }
    @io.swagger.v3.oas.annotations.media.Schema(additionalProperties=io.swagger.v3.oas.annotations.media.Schema.AdditionalPropertiesValue.FALSE)
    public record RequestInput(String kind,Instant expectedUpdatedAt){
        @com.fasterxml.jackson.annotation.JsonAnySetter public void reject(String k,Object v){throw new IllegalArgumentException("Unknown request field");}
    }
    @io.swagger.v3.oas.annotations.media.Schema(name="StayJourneyPaymentReceipt")
    public record Payment(UUID operationId,UUID folioId,String result,String amount,String currency,UUID movementId,Instant completedAt){}
    private static final String DISCLAIMER="Documento informativo — sin validez fiscal";
    private static ResponseStatusException conflict(String code){return RoomServiceBillingService.conflict(code);}
    private Stay stay(UUID reservation,UUID id,UUID property){
        return jdbc.sql("SELECT s.*,r.confirmation_code,p.timezone FROM reservation_stays s JOIN reservations r ON r.id=s.reservation_id JOIN properties p ON p.id=s.property_id WHERE s.id=:s AND s.reservation_id=:r AND s.property_id=:p")
                .param("s",id).param("r",reservation).param("p",property).query((rs,n)->new Stay(property,reservation,id,rs.getString("confirmation_code"),rs.getString("status"),rs.getTimestamp("updated_at").toInstant(),rs.getObject("room_id",UUID.class),rs.getObject("arrival",LocalDate.class),rs.getObject("departure",LocalDate.class),rs.getString("timezone")))
                .optional().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"STAY_UNAVAILABLE"));
    }
    private GuestPrincipal guest(GuestPrincipal p){if(p==null)throw new GuestAuthenticationException();return guests.getActivePrincipal(p);}
    private Stay guestStay(GuestPrincipal p,UUID reservation,UUID id,boolean financial){
        var c=contexts.load(p.guestAccountId(),reservation,id,false);
        if(financial&&!jdbc.sql("""
            SELECT EXISTS(SELECT 1 FROM reservations r JOIN guest_profiles g ON g.id=r.booking_guest_id
              JOIN guest_accounts a ON a.id=:a WHERE r.id=:r AND r.property_id=:p AND a.status='ACTIVE'
              AND a.email_verified_at IS NOT NULL AND lower(btrim(g.email))=lower(btrim(a.email))
              AND (g.guest_account_id IS NULL OR g.guest_account_id=a.id))
            """).param("a",p.guestAccountId()).param("r",reservation).param("p",c.propertyId()).query(Boolean.class).single())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"FINANCIAL_ACCESS_UNAVAILABLE");
        return stay(reservation,id,c.propertyId());
    }
    private UUID staff(StaffPrincipal p,UUID property,String permission){
        if(p==null)throw new StaffAuthenticationException();var active=staff.getActivePrincipal(p);var authorization=permissions.resolve(active.staffUserId());
        if(!authorization.hasPermission(permission))throw new AccessDeniedException("Stay journey access denied");
        scopes.resolveProperty(authorization,property);return active.staffUserId();
    }
    @io.swagger.v3.oas.annotations.media.Schema(name="StayJourneyState")
    public record State(Stay stay,LocalDate currentDate,List<Request> requests){}
    public State guestState(GuestPrincipal p,UUID r,UUID s){var a=guest(p);var current=guestStay(a,r,s,false);return new State(current,LocalDate.now(ZoneId.of(current.timezone)),requests(current));}
    public List<Request> guestRequests(GuestPrincipal p,UUID r,UUID s){var a=guest(p);return requests(guestStay(a,r,s,false));}
    public List<Request> staffRequests(StaffPrincipal p,UUID property,UUID r,UUID s){staff(p,property,"RESERVATION_MANAGE");return requests(stay(r,s,property));}
    private List<Request> requests(Stay s){return jdbc.sql("SELECT * FROM stay_journey_requests WHERE property_id=:p AND stay_id=:s ORDER BY created_at,id")
            .param("p",s.propertyId).param("s",s.stayId).query((rs,n)->new Request(rs.getObject("id",UUID.class),rs.getString("kind"),rs.getString("status"),rs.getTimestamp("created_at").toInstant(),rs.getTimestamp("completed_at")==null?null:rs.getTimestamp("completed_at").toInstant())).list();}
    public Request request(GuestPrincipal p,UUID r,UUID s,String key,RequestInput input){
        var a=guest(p);key(key);if(input==null||!Set.of("CHECK_IN","CHECK_OUT").contains(input.kind==null?"":input.kind)||input.expectedUpdatedAt==null)throw new IllegalArgumentException("Invalid request");
        var current=guestStay(a,r,s,input.kind.equals("CHECK_OUT"));billing.lock(current.propertyId,r);
        current=guestStay(a,r,s,input.kind.equals("CHECK_OUT"));
        jdbc.sql("SELECT id FROM reservation_stays WHERE id=:s FOR UPDATE").param("s",s).query(UUID.class).single();
        current=guestStay(a,r,s,input.kind.equals("CHECK_OUT"));
        var prior=jdbc.sql("SELECT stay_id,kind,id,expected_stay_updated_at FROM stay_journey_requests WHERE guest_account_id=:a AND request_key=:k").param("a",a.guestAccountId()).param("k",key)
                .query((rs,n)->List.of(rs.getObject(1,UUID.class),rs.getString(2),rs.getObject(3,UUID.class),rs.getTimestamp(4).toInstant())).optional();
        if(prior.isPresent()){if(!prior.get().get(0).equals(s)||!prior.get().get(1).equals(input.kind)||!prior.get().get(3).equals(input.expectedUpdatedAt))throw conflict("IDEMPOTENCY_KEY_REUSED");return requests(current).stream().filter(x->x.id.equals(prior.get().get(2))).findFirst().orElseThrow();}
        if(!current.updatedAt.equals(input.expectedUpdatedAt))throw conflict("STALE_STAY");
        if(input.kind.equals("CHECK_IN")){
            LocalDate today=LocalDate.now(ZoneId.of(current.timezone));
            if(!current.status.equals("RESERVED")||today.isBefore(current.arrival)||!today.isBefore(current.departure)
                ||!jdbc.sql("SELECT status='CONFIRMED' FROM reservations WHERE id=:r").param("r",r).query(Boolean.class).single())throw conflict("CHECK_IN_UNAVAILABLE");
        }else {
            if(!current.status.equals("IN_HOUSE"))throw conflict("CHECK_OUT_UNAVAILABLE");
            billing.requireCheckoutReady(current.propertyId,r);
        }
        UUID id=UUID.randomUUID();jdbc.sql("INSERT INTO stay_journey_requests(id,property_id,reservation_id,stay_id,guest_account_id,kind,status,request_key,expected_stay_updated_at) VALUES(:id,:p,:r,:s,:a,:kind,'OPEN',:key,:expected)")
            .param("id",id).param("p",current.propertyId).param("r",r).param("s",s).param("a",a.guestAccountId()).param("kind",input.kind).param("key",key).param("expected",java.sql.Timestamp.from(input.expectedUpdatedAt)).update();
        event(ActorType.GUEST,a.guestAccountId(),current,"STAY_"+input.kind+"_REQUESTED",id,id);
        return requests(current).stream().filter(x->x.id.equals(id)).findFirst().orElseThrow();
    }
    public Summary guestSummary(GuestPrincipal p,UUID r,UUID s){return summary(guestStay(guest(p),r,s,true));}
    public Summary staffSummary(StaffPrincipal p,UUID property,UUID r,UUID s){staff(p,property,"FOLIO_PAYMENT_OPERATE");return summary(stay(r,s,property));}
    public Summary reconcile(StaffPrincipal p,UUID property,UUID r,UUID s){var actor=staff(p,property,"FOLIO_PAYMENT_OPERATE");var current=stay(r,s,property);billing.reconcile(property,r,actor);entities.flush();return summary(current);}
    private Summary summary(Stay s){
        billing.lock(s.propertyId,s.reservationId);
        UUID folio=billing.standardFolio(s.propertyId,s.reservationId);
        var lines=jdbc.sql("SELECT m.*, CASE WHEN o.id IS NOT NULL THEN 'Room Service · ' || to_char(o.service_date,'DD/MM') || ' · ' || to_char(o.delivery_time,'HH24:MI') ELSE m.description END AS display_description FROM folio_movements m LEFT JOIN room_service_folio_postings p ON p.movement_id=m.id LEFT JOIN room_service_orders o ON o.id=p.order_id AND o.stay_id=:s WHERE m.folio_id=:f ORDER BY m.created_at,m.id").param("f",folio).param("s",s.stayId)
            .query((rs,n)->new Line(rs.getObject("id",UUID.class),rs.getString("kind"),rs.getString("display_description"),money(rs.getLong("amount_minor")),rs.getTimestamp("created_at").toInstant())).list();
        long balance=0,charges=0,payments=0,adjustments=0;
        for(var line:lines){long value=new BigDecimal(line.amount).movePointRight(2).longValueExact();balance=Math.addExact(balance,value);
            switch(line.kind){case "CHARGE" -> charges=Math.addExact(charges,value);case "PAYMENT" -> payments=Math.addExact(payments,Math.negateExact(value));default -> adjustments=Math.addExact(adjustments,value);}
        }
        int pending=jdbc.sql("SELECT count(*) FROM service_requests sr JOIN billable_service_orders o ON o.id=sr.id WHERE sr.property_id=:p AND sr.reservation_id=:r AND o.total_minor>0 AND sr.status IN ('OPEN','IN_PROGRESS')").param("p",s.propertyId).param("r",s.reservationId).query(Integer.class).single();
        int unposted=jdbc.sql("SELECT count(*) FROM service_requests sr JOIN billable_service_orders o ON o.id=sr.id LEFT JOIN billable_service_postings b ON b.order_id=o.id WHERE sr.property_id=:p AND sr.reservation_id=:r AND sr.status='DONE' AND b.order_id IS NULL AND o.total_minor>0").param("p",s.propertyId).param("r",s.reservationId).query(Integer.class).single();
        var doc=jdbc.sql("SELECT id FROM stay_informative_documents WHERE stay_id=:s AND property_id=:p").param("s",s.stayId).param("p",s.propertyId).query(UUID.class).optional().orElse(null);
        return new Summary(s,folio,"GTQ",money(balance),money(charges),money(payments),money(adjustments),!lines.isEmpty(),pending,unposted,lines,requests(s),doc,DISCLAIMER,jdbc.sql("SELECT sr.id,o.description,o.total_minor FROM service_requests sr JOIN billable_service_orders o ON o.id=sr.id WHERE sr.property_id=:p AND sr.reservation_id=:r AND sr.stay_id=:s AND o.category='TRANSFER' AND o.total_minor>0 AND sr.status IN ('OPEN','IN_PROGRESS') ORDER BY sr.created_at,sr.id").param("p",s.propertyId).param("r",s.reservationId).param("s",s.stayId).query((rs,n)->new Estimate(rs.getObject("id",UUID.class),rs.getString("description"),money(rs.getLong("total_minor")))).list());
    }
    public Payment guestPay(GuestPrincipal p,UUID r,UUID s,String key,PaymentInput input){var a=guest(p);return pay(guestStay(a,r,s,true),ActorType.GUEST,a.guestAccountId(),key,input);}
    public Payment staffPay(StaffPrincipal p,UUID property,UUID r,UUID s,String key,PaymentInput input){var actor=staff(p,property,"FOLIO_PAYMENT_OPERATE");return pay(stay(r,s,property),ActorType.STAFF,actor,key,input);}
    private Payment pay(Stay s,ActorType type,UUID actor,String key,PaymentInput input){
        key(key);if(input==null||input.amount==null||!input.amount.matches("[0-9]{1,15}(\\.[0-9]{1,2})?")||!"GTQ".equals(input.currency))throw new IllegalArgumentException("Invalid payment");
        long minor;try{minor=new BigDecimal(input.amount).movePointRight(2).longValueExact();}catch(RuntimeException e){throw new IllegalArgumentException("Invalid amount");}if(minor<=0)throw new IllegalArgumentException("Invalid amount");
        String result=switch(input.instrumentToken==null?"":input.instrumentToken){case "demo_visa_approved","demo_mastercard_approved","demo_amex_approved"->"APPROVED";case "demo_card_declined"->"DECLINED";case "demo_gateway_error"->"ERROR";default->throw new IllegalArgumentException("Synthetic instrument required");};
        billing.lock(s.propertyId,s.reservationId);
        String hash=hash(s.reservationId+"/"+s.stayId+"/"+minor+"/GTQ/"+input.instrumentToken);
        var prior=jdbc.sql("SELECT id,payload_hash FROM simulated_folio_payments WHERE actor_type=:t AND actor_id=:a AND request_key=:k")
            .param("t",type.name()).param("a",actor).param("k",key).query((rs,n)->Map.entry(rs.getObject(1,UUID.class),rs.getString(2))).optional();
        if(prior.isPresent()){if(!prior.get().getValue().equals(hash))throw conflict("IDEMPOTENCY_KEY_REUSED");return payment(prior.get().getKey());}
        var current=stay(s.reservationId,s.stayId,s.propertyId);
        if(!Set.of("RESERVED","IN_HOUSE").contains(current.status))throw conflict("STAY_NOT_PAYABLE");
        var summary=summary(current);if(!summary.verifiable)throw conflict("BALANCE_UNVERIFIABLE");
        if(summary.unpostedOrders>0)throw conflict("UNPOSTED_SERVICE_CHARGES");
        if(!jdbc.sql("SELECT status='OPEN' FROM folios WHERE id=:f").param("f",summary.folioId).query(Boolean.class).single())throw conflict("FOLIO_NOT_OPEN");
        if(new BigDecimal(summary.balance).movePointRight(2).longValueExact()<minor)throw conflict("PAYMENT_EXCEEDS_BALANCE");
        UUID id=UUID.randomUUID(),movement=null;
        if(result.equals("APPROVED")){
            var amount=new FolioService.MovementAmount(new MonetaryAmount(new MinorUnits(minor),Currency.getInstance("GTQ")),"Pago simulado · SIM-"+id);
            movement=(type==ActorType.GUEST?folios.postPaymentAsGuest(summary.folioId,amount,actor):folios.postPayment(summary.folioId,amount,actor)).id();entities.flush();
        }
        jdbc.sql("INSERT INTO simulated_folio_payments(id,property_id,reservation_id,folio_id,actor_type,actor_id,request_key,payload_hash,result,amount_minor,movement_id) VALUES(:id,:p,:r,:f,:t,:a,:k,:h,:result,:amount,:m)")
            .param("id",id).param("p",s.propertyId).param("r",s.reservationId).param("f",summary.folioId).param("t",type.name()).param("a",actor).param("k",key).param("h",hash).param("result",result).param("amount",minor).param("m",movement).update();
        event(type,actor,s,"SIMULATED_PAYMENT_"+result,id,id);return payment(id);
    }
    private Payment payment(UUID id){return jdbc.sql("SELECT * FROM simulated_folio_payments WHERE id=:id").param("id",id).query((rs,n)->new Payment(id,rs.getObject("folio_id",UUID.class),rs.getString("result"),money(rs.getLong("amount_minor")),"GTQ",rs.getObject("movement_id",UUID.class),rs.getTimestamp("completed_at").toInstant())).single();}
    public void confirmed(UUID property,UUID reservation,UUID stayId,UUID actor,UUID operation,boolean arrival){
        var s=stay(reservation,stayId,property);
        jdbc.sql("UPDATE stay_journey_requests SET status='DONE',completed_at=now() WHERE property_id=:p AND stay_id=:s AND kind=:kind AND status='OPEN'")
            .param("p",property).param("s",stayId).param("kind",arrival?"CHECK_IN":"CHECK_OUT").update();
        if(arrival)return;
        var snapshot=summary(s);UUID id=UUID.randomUUID();
        jdbc.sql("INSERT INTO stay_informative_documents(id,property_id,reservation_id,stay_id,operation_id,snapshot) VALUES(:id,:p,:r,:s,:o,CAST(:snapshot AS jsonb))")
            .param("id",id).param("p",property).param("r",reservation).param("s",stayId).param("o",operation).param("snapshot",json.writeValueAsString(snapshot)).update();
        event(ActorType.STAFF,actor,s,"INFORMATIVE_DOCUMENT_ISSUED",id,operation);
    }
    public Document guestDocument(GuestPrincipal p,UUID r,UUID s){return document(guestStay(guest(p),r,s,true));}
    public Document staffDocument(StaffPrincipal p,UUID property,UUID r,UUID s){staff(p,property,"FOLIO_PAYMENT_OPERATE");return document(stay(r,s,property));}
    public record DocumentFile(UUID documentId,String pdfBase64,String sha256,Instant createdAt){}
    public DocumentFile guestFile(GuestPrincipal p,UUID r,UUID s,boolean issue){var a=guest(p);return file(guestStay(a,r,s,true),issue,ActorType.GUEST,a.guestAccountId());}
    public DocumentFile staffFile(StaffPrincipal p,UUID property,UUID r,UUID s,boolean issue){var a=staff(p,property,"FOLIO_PAYMENT_OPERATE");return file(stay(r,s,property),issue,ActorType.STAFF,a);}
    private DocumentFile file(Stay s,boolean issue,ActorType actorType,UUID actor){
        var doc=document(s);
        jdbc.sql("SELECT id FROM stay_informative_documents WHERE id=:id FOR UPDATE").param("id",doc.id()).query(UUID.class).single();
        var existing=jdbc.sql("SELECT * FROM stay_document_files WHERE document_id=:id").param("id",doc.id()).query((rs,n)->new DocumentFile(doc.id(),Base64.getEncoder().encodeToString(rs.getBytes("pdf")),rs.getString("sha256"),rs.getTimestamp("created_at").toInstant())).optional();
        if(existing.isPresent())return existing.get();
        if(!issue)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"DOCUMENT_FILE_UNAVAILABLE");
        if(!"CHECKED_OUT".equals(s.status)||!"CHECKED_OUT".equals(doc.snapshot.stay.status)||!doc.snapshot.verifiable||!"0.00".equals(doc.snapshot.balance)||doc.snapshot.pendingOrders>0||doc.snapshot.unpostedOrders>0)throw conflict("DOCUMENT_NOT_ELIGIBLE");
        var settled=summary(s);if(!settled.verifiable||!"0.00".equals(settled.balance)||settled.pendingOrders>0||settled.unpostedOrders>0)throw conflict("DOCUMENT_NOT_ELIGIBLE");
        Instant emittedAt=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);byte[] pdf=StayDocumentPdf.render(doc,emittedAt);if(pdf.length>8000000)throw conflict("DOCUMENT_TOO_LARGE");String digest;
        try{digest=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(pdf));}catch(Exception e){throw new IllegalStateException(e);}
        jdbc.sql("INSERT INTO stay_document_files(document_id,pdf,sha256,created_at) VALUES(:id,:pdf,:hash,:at)").param("id",doc.id()).param("pdf",pdf).param("hash",digest).param("at",java.sql.Timestamp.from(emittedAt)).update();
        event(actorType,actor,s,"INFORMATIVE_PDF_ISSUED",doc.id(),doc.id());
        return file(s,false,actorType,actor);
    }
    private Document document(Stay s){return jdbc.sql("SELECT * FROM stay_informative_documents WHERE stay_id=:s AND property_id=:p")
        .param("s",s.stayId).param("p",s.propertyId).query((rs,n)->new Document(rs.getObject("id",UUID.class),rs.getTimestamp("issued_at").toInstant(),json.readValue(rs.getString("snapshot"),Summary.class)))
        .optional().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"DOCUMENT_UNAVAILABLE"));}
    private void event(ActorType type,UUID actor,Stay s,String action,UUID entity,UUID correlation){audit.record(new AuditService.RecordAuditCommand(type,actor,action,"STAY_JOURNEY",entity,s.propertyId,null,"{}",null,correlation));}
    private static void key(String key){if(key==null||!key.matches("[A-Za-z0-9-]{16,100}"))throw new IllegalArgumentException("Invalid operation key");}
    private static String money(long value){return BigDecimal.valueOf(value,2).toPlainString();}
    private static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}
