package com.pms.hotelboutique.backend.modules.reservations.application;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.pms.hotelboutique.backend.shared.money.*;

/** Persisted delivered orders, never catalogue estimates. Shared financial lock serializes checkout and postings. */
@Service
@Transactional
public class RoomServiceBillingService {
    private final JdbcClient jdbc;
    private final FolioService folios;
    private final FolioTransactionGuard guard;
    private final jakarta.persistence.EntityManager entities;
    public RoomServiceBillingService(JdbcClient jdbc,FolioService folios,FolioTransactionGuard guard,jakarta.persistence.EntityManager entities){this.jdbc=jdbc;this.folios=folios;this.guard=guard;this.entities=entities;}
    public void lock(UUID property,UUID reservation){guard.lock(property,reservation);}
    public UUID standardFolio(UUID property,UUID reservation){
        if(!jdbc.sql("SELECT EXISTS(SELECT 1 FROM reservations r JOIN properties p ON p.id=r.property_id WHERE r.id=:r AND r.property_id=:p AND r.currency='GTQ' AND p.currency='GTQ' AND r.group_id IS NULL)")
            .param("r",reservation).param("p",property).query(Boolean.class).single())throw conflict("UNSUPPORTED_FINANCIAL_SCENARIO");
        if(jdbc.sql("SELECT count(*) FROM reservation_stays WHERE reservation_id=:r AND property_id=:p")
                .param("r",reservation).param("p",property).query(Integer.class).single()!=1)throw conflict("UNSUPPORTED_FINANCIAL_SCENARIO");
        var ids=jdbc.sql("SELECT id FROM folios WHERE property_id=:p AND reservation_id=:r AND type='GUEST' AND currency='GTQ' AND group_id IS NULL")
                .param("p",property).param("r",reservation).query(UUID.class).list();
        int all=jdbc.sql("SELECT count(*) FROM folios WHERE property_id=:p AND reservation_id=:r").param("p",property).param("r",reservation).query(Integer.class).single();
        if(all==0)throw conflict("BALANCE_UNVERIFIABLE");
        if(ids.size()!=1||all!=1)throw conflict("UNSUPPORTED_FINANCIAL_SCENARIO");
        return ids.getFirst();
    }
    public void reconcile(UUID property,UUID reservation,UUID actor){
        guard.lock(property,reservation);
        var ids=jdbc.sql("SELECT sr.id FROM service_requests sr JOIN room_service_orders o ON o.id=sr.id LEFT JOIN room_service_folio_postings b ON b.order_id=o.id WHERE sr.property_id=:p AND sr.reservation_id=:r AND sr.status='DONE' AND b.order_id IS NULL AND o.total_minor>0 ORDER BY sr.id")
                .param("p",property).param("r",reservation).query(UUID.class).list();
        for(var id:ids) delivered(id,actor);
    }
    public boolean beforeTransition(UUID order,String action){
        var row=jdbc.sql("SELECT sr.property_id,sr.reservation_id,s.status FROM room_service_orders o JOIN service_requests sr ON sr.id=o.id JOIN reservation_stays s ON s.id=sr.stay_id WHERE o.id=:id")
            .param("id",order).query((rs,n)->new Object[]{rs.getObject(1,UUID.class),rs.getObject(2,UUID.class),rs.getString(3)}).optional();
        if(row.isEmpty())return false;
        guard.lock((UUID)row.get()[0],(UUID)row.get()[1]);
        if(jdbc.sql("SELECT total_minor FROM room_service_orders WHERE id=:id").param("id",order).query(Long.class).single()==0)return true;
        if(jdbc.sql("SELECT EXISTS(SELECT 1 FROM stay_informative_documents WHERE stay_id=(SELECT stay_id FROM service_requests WHERE id=:id))")
            .param("id",order).query(Boolean.class).single())throw conflict("STAY_FINANCIALLY_FINALIZED");
        if((action.equals("REQUEST_REOPENED")||action.equals("REQUEST_CANCELLED"))&&jdbc.sql("SELECT EXISTS(SELECT 1 FROM room_service_folio_postings WHERE order_id=:id)")
            .param("id",order).query(Boolean.class).single())throw conflict("CHARGED_ORDER_IMMUTABLE");
        return true;
    }
    public void delivered(UUID order,UUID actor){
        var rows=jdbc.sql("SELECT sr.property_id,sr.reservation_id,o.total_minor,o.currency,s.status FROM room_service_orders o JOIN service_requests sr ON sr.id=o.id JOIN reservation_stays s ON s.id=sr.stay_id WHERE o.id=:id")
                .param("id",order).query((rs,n)->new Order(rs.getObject(1,UUID.class),rs.getObject(2,UUID.class),rs.getLong(3),rs.getString(4),rs.getString(5))).list();
        if(rows.isEmpty())return;var row=rows.getFirst();guard.lock(row.property,row.reservation);
        if(jdbc.sql("SELECT EXISTS(SELECT 1 FROM room_service_folio_postings WHERE order_id=:id)").param("id",order).query(Boolean.class).single())return;
        if(row.total==0)return;
        var folio=standardFolio(row.property,row.reservation);
        if(!"GTQ".equals(row.currency)||row.total<0)throw conflict("UNSUPPORTED_SERVICE_CHARGE");
        if(!folios.get(folio).status().name().equals("OPEN"))throw conflict("FOLIO_NOT_OPEN");
        var movement=folios.postCharge(folio,new FolioService.MovementAmount(new MonetaryAmount(new MinorUnits(row.total),Currency.getInstance("GTQ")),"Room Service · "+order),actor);
        entities.flush();
        jdbc.sql("INSERT INTO room_service_folio_postings(order_id,movement_id) VALUES(:id,:movement)").param("id",order).param("movement",movement.id()).update();
    }
    public void requireNoPending(UUID property,UUID reservation){
        if(jdbc.sql("SELECT count(*) FROM service_requests sr JOIN room_service_orders o ON o.id=sr.id LEFT JOIN room_service_folio_postings b ON b.order_id=o.id WHERE sr.property_id=:p AND sr.reservation_id=:r AND o.total_minor>0 AND (sr.status IN ('OPEN','IN_PROGRESS') OR sr.status='DONE' AND b.order_id IS NULL)")
                .param("p",property).param("r",reservation).query(Integer.class).single()>0)throw conflict("PENDING_BILLABLE_ORDERS");
    }
    public static ResponseStatusException conflict(String code){return new ResponseStatusException(HttpStatus.CONFLICT,code);}
    private record Order(UUID property,UUID reservation,long total,String currency,String status){}
}
