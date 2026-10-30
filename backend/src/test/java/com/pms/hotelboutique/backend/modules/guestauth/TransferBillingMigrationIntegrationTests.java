package com.pms.hotelboutique.backend.modules.guestauth;
import java.sql.*;
import java.util.*;
import javax.sql.DataSource;
import liquibase.integration.spring.SpringLiquibase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest
class TransferBillingMigrationIntegrationTests {
 @Autowired DataSource db;
 void migrate(Connection c,String schema,String path)throws Exception{c.setSchema(schema);var l=new SpringLiquibase();l.setDataSource(new SingleConnectionDataSource(c,true));l.setDefaultSchema(schema);l.setLiquibaseSchema(schema);l.setChangeLog(path);l.afterPropertiesSet();}
 void sql(Connection c,String query)throws Exception{try(var s=c.createStatement()){s.execute(query);}}
 String value(Connection c,String query)throws Exception{try(var s=c.createStatement();var r=s.executeQuery(query)){r.next();return r.getString(1);}}
 @Test void additiveUpgradePricesOnlyEligiblePendingTransfersAndPreservesHistoricalFinancialData()throws Exception{
  try(var c=db.getConnection()){String original=c.getSchema(),schema="transfer_price_upgrade_"+UUID.randomUUID().toString().replace("-","");sql(c,"create schema "+schema);
   try{
    migrate(c,schema,"classpath:db/changelog/db.changelog-before-transfer-billing.yaml");
    UUID property=UUID.fromString("3032709f-a48b-300b-b860-1110bc6f1f13"),account=UUID.randomUUID(),profile=UUID.randomUUID(),type=UUID.randomUUID();
    sql(c,"insert into properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) select '"+property+"',organization_id,'PRICE-QA','Hotel Boutique Demo','America/Guatemala','GTQ','ACTIVE',now(),now() from properties limit 1");
    sql(c,"insert into guest_accounts(id,email,email_verified_at,status,created_at,updated_at) values ('"+account+"','price-upgrade@example.test',now(),'ACTIVE',now(),now())");
    sql(c,"insert into guest_profiles(id,first_name,last_name,status,created_at,updated_at) values ('"+profile+"','Synthetic','Migration','ACTIVE',now(),now())");
    sql(c,"insert into room_types(id,property_id,code,name) values ('"+type+"','"+property+"','PRICE-QA','Synthetic QA')");
    var requests=new ArrayList<UUID>();
    for(int i=0;i<4;i++){
     UUID reservation=UUID.randomUUID(),stay=UUID.randomUUID(),request=UUID.randomUUID(),folio=UUID.randomUUID();requests.add(request);String status=i==1?"DONE":i==3?"CANCELLED":"OPEN",stayStatus=i==1||i==2?"CHECKED_OUT":"IN_HOUSE";
     sql(c,"insert into reservations(id,property_id,booking_guest_id,confirmation_code,status,currency,source_channel,created_at,updated_at) values ('"+reservation+"','"+property+"','"+profile+"','UPGRADE"+i+"','CONFIRMED','GTQ','WEB_DIRECTA',now(),now())");
     sql(c,"insert into reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) values ('"+stay+"','"+reservation+"','"+property+"','"+type+"',current_date,current_date+3,'"+stayStatus+"',now(),now())");
     sql(c,"insert into folios(id,property_id,type,status,reservation_id,currency,created_at,updated_at) values ('"+folio+"','"+property+"','GUEST','OPEN','"+reservation+"','GTQ',now(),now())");
     sql(c,"insert into folio_movements(id,folio_id,kind,amount_minor,currency,description,created_at) values ('"+UUID.randomUUID()+"','"+folio+"','CHARGE',10000,'GTQ','Legacy accommodation',now())");
     sql(c,"insert into service_requests(id,property_id,reservation_id,stay_id,category,subject,priority,status,due_at,created_at,updated_at) values ('"+request+"','"+property+"','"+reservation+"','"+stay+"','TRANSFER','Traslado','MEDIUM','"+status+"',now()+interval '1 day',now(),now())");
     sql(c,"insert into transfer_requests(id,stay_id,guest_account_id,request_key,initial_payload_hash,current_payload_hash,service_date,delivery_time,route_snapshot) values ('"+request+"','"+stay+"','"+account+"','legacy-"+i+"','hash','hash',current_date+1,'09:00','{\"origin\":{\"key\":\"place-hotel\",\"displayText\":\"Hotel\"},\"destination\":{\"key\":\"place-airport\",\"displayText\":\"Aeropuerto\"},\"passengers\":2}')");
     if(i==1||i==2){UUID doc=UUID.randomUUID();sql(c,"insert into stay_informative_documents(id,property_id,reservation_id,stay_id,operation_id,snapshot) values ('"+doc+"','"+property+"','"+reservation+"','"+stay+"','"+UUID.randomUUID()+"','{\"legacy\":true}')");sql(c,"insert into stay_document_files(document_id,pdf,sha256) values ('"+doc+"',convert_to('synthetic original binary','UTF8'),'synthetic-hash')");}
    }
    String ledger=value(c,"select string_agg(md5(to_jsonb(t)::text),',' order by id) from folio_movements t"),documents=value(c,"select string_agg(md5(to_jsonb(t)::text),',' order by document_id) from stay_document_files t"),snapshots=value(c,"select string_agg(md5(snapshot::text),',' order by id) from stay_informative_documents");
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");
    assertEquals("5800",value(c,"select total_minor from transfer_requests where id='"+requests.getFirst()+"'"));assertEquals("8",value(c,"select count(*) from transfer_route_prices"));
    for(int i=1;i<4;i++)assertNull(value(c,"select total_minor from transfer_requests where id='"+requests.get(i)+"'"));
    assertEquals(ledger,value(c,"select string_agg(md5(to_jsonb(t)::text),',' order by id) from folio_movements t"));assertEquals(documents,value(c,"select string_agg(md5(to_jsonb(t)::text),',' order by document_id) from stay_document_files t"));assertEquals(snapshots,value(c,"select string_agg(md5(snapshot::text),',' order by id) from stay_informative_documents"));
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");assertEquals("8",value(c,"select count(*) from transfer_route_prices"));assertEquals("0",value(c,"select count(*) from transfer_folio_postings"));
   }finally{c.setSchema(original);sql(c,"drop schema "+schema+" cascade");}
  }
 }
}
