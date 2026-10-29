package com.pms.hotelboutique.backend.modules.guestauth;

import java.sql.Connection;
import java.util.*;
import javax.sql.DataSource;
import liquibase.integration.spring.SpringLiquibase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ValetMigrationIntegrationTests {
 @Autowired DataSource db;
 private void migrate(Connection c,String schema,String path)throws Exception {
  c.setSchema(schema);var migration=new SpringLiquibase();migration.setDataSource(new SingleConnectionDataSource(c,true));migration.setDefaultSchema(schema);migration.setLiquibaseSchema(schema);migration.setChangeLog(path);migration.afterPropertiesSet();
 }
 private void sql(Connection c,String text)throws Exception {try(var s=c.createStatement()){s.execute(text);}}
 private Map<String,String> manifest(Connection c)throws Exception {
  var result=new TreeMap<String,String>();try(var s=c.createStatement();var rs=s.executeQuery("select id,md5sum from databasechangelog")){while(rs.next())result.put(rs.getString(1),rs.getString(2));}return result;
 }
 private int count(Connection c,String query)throws Exception {try(var s=c.createStatement();var rs=s.executeQuery(query)){rs.next();return rs.getInt(1);}}
 @Test void upgradeFromCurrentMainPreservesHistoricalDataChecksumsAndReappliesValetOnce()throws Exception {
  try(var c=db.getConnection()) {
   var current=manifest(c);String original=c.getSchema(),schema="valet_upgrade_"+UUID.randomUUID().toString().replace("-","");sql(c,"create schema "+schema);
   try {
    migrate(c,schema,"classpath:db/changelog/db.changelog-before-valet.yaml");var before=manifest(c);assertEquals(current.size()-2,before.size());
    sql(c,"insert into service_requests(id,property_id,category,subject,priority,status,created_at,updated_at) values ('00000000-0000-4000-8000-000000000001','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','HOUSEKEEPING','Historical housekeeping','MEDIUM','DONE',now(),now()),('00000000-0000-4000-8000-000000000002','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','ROOM_SERVICE','Historical room service','MEDIUM','OPEN',now(),now())");
    sql(c,"create table historical_services_snapshot as select * from service_requests");
    sql(c,"create table historical_menu_snapshot as select * from room_service_products");
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");var after=manifest(c);assertEquals(current,after);assertTrue(after.containsKey("005-operations-007"));before.forEach((id,checksum)->assertEquals(checksum,after.get(id)));
    assertEquals(0,count(c,"select count(*) from ((select * from service_requests except select * from historical_services_snapshot) union all (select * from historical_services_snapshot except select * from service_requests)) changes"));
    assertEquals(0,count(c,"select count(*) from ((select * from room_service_products except select * from historical_menu_snapshot) union all (select * from historical_menu_snapshot except select * from room_service_products)) changes"));
    assertEquals(0,count(c,"select count(*) from properties p where (select count(*) from amenities_catalog c where c.property_id=p.id)<>5"));
    int total=count(c,"select count(*) from amenities_catalog");
    sql(c,"select provision_amenities_catalog(id) from properties");assertEquals(total,count(c,"select count(*) from amenities_catalog"));
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");assertEquals(after,manifest(c));assertEquals(total,count(c,"select count(*) from amenities_catalog"));
    assertEquals(0,count(c,"select count(*) from valet_requests"));assertEquals(0,count(c,"select count(*) from valet_vehicles"));
    assertEquals(0,count(c,"select count(*) from information_schema.columns where table_schema='"+schema+"' and table_name like 'valet_%' and column_name in ('price','unit_price_minor','total_minor','currency')"));
   }finally{c.setSchema(original);sql(c,"drop schema "+schema+" cascade");}
  }
 }
 @Test void reusableUpgradePreservesLegacyAssociationsAndRequestSnapshotsAndRejectsIncompatibleCustody()throws Exception {
  for(boolean incompatible:new boolean[]{false,true})try(var c=db.getConnection()){
   var current=manifest(c);String original=c.getSchema(),schema="valet_reuse_upgrade_"+UUID.randomUUID().toString().replace("-","");sql(c,"create schema "+schema);
   try{
    migrate(c,schema,"classpath:db/changelog/db.changelog-before-reusable-valet.yaml");var before=manifest(c);assertEquals(current.size()-1,before.size());
    sql(c,"insert into guest_accounts(id,email,email_verified_at,status,created_at,updated_at) values ('10000000-0000-4000-8000-000000000001','reuse@example.test',now(),'ACTIVE',now(),now())");
    sql(c,"insert into guest_profiles(id,first_name,last_name,status,created_at,updated_at) values ('20000000-0000-4000-8000-000000000001','Migration','Fixture','ACTIVE',now(),now())");
    sql(c,"insert into reservations(id,property_id,booking_guest_id,confirmation_code,status,currency,source_channel,created_at,updated_at) values ('30000000-0000-4000-8000-000000000001','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','20000000-0000-4000-8000-000000000001','REUSE-MIGRATION','CONFIRMED','GTQ','WEB_DIRECTA',now(),now())");
    sql(c,"insert into room_types(id,property_id,code,name) values ('40000000-0000-4000-8000-000000000001','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','VAL-MIG','Migration fixture')");
    for(int n=1;n<=2;n++){
     String suffix=String.format("%012d",n);
     sql(c,"insert into reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) values ('50000000-0000-4000-8000-"+suffix+"','30000000-0000-4000-8000-000000000001','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','40000000-0000-4000-8000-000000000001','2030-01-01','2030-01-03','"+(n==1?"CHECKED_OUT":"IN_HOUSE")+"',now(),now())");
     sql(c,"insert into valet_vehicles(id,guest_account_id,stay_id,property_id,make,model,plate_prefix,plate_body,color,location,creation_key,initial_payload_hash,created_at,updated_at) values ('60000000-0000-4000-8000-"+suffix+"','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-"+suffix+"','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','"+(n==1?"Toyota":"Honda")+"','QA','P','123ABC','Azul','"+(n==1&&!incompatible?"WITH_GUEST":"PARKED")+"','migration-fixture-"+n+"',repeat('a',64),'2030-01-0"+n+"T00:00:00Z','2030-01-0"+n+"T00:00:00Z')");
    }
    sql(c,"insert into service_requests(id,property_id,reservation_id,stay_id,category,subject,priority,status,created_at,updated_at,due_at) values ('70000000-0000-4000-8000-000000000001','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','VALET','Legacy delivery','MEDIUM','DONE',now(),now(),now())");
    sql(c,"insert into valet_requests(id,vehicle_id,stay_id,property_id,guest_account_id,request_key,initial_payload_hash,current_payload_hash,service_date,delivery_time,vehicle_snapshot) values ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','10000000-0000-4000-8000-000000000001','legacy-request-key',repeat('b',64),repeat('b',64),'2030-01-03','09:00','{\"make\":\"Toyota\"}'::jsonb)");
    sql(c,"create table legacy_vehicle_copy as select * from valet_vehicles");sql(c,"create table legacy_request_copy as select * from valet_requests");
    if(incompatible){
     assertThrows(Exception.class,()->migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml"));if(!c.getAutoCommit())c.rollback();c.setAutoCommit(true);assertEquals(before,manifest(c));assertEquals(0,count(c,"select count(*) from information_schema.tables where table_schema='"+schema+"' and table_name='valet_saved_vehicles'"));
    }else{
     migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");var after=manifest(c);assertEquals(current,after);before.forEach((id,sum)->assertEquals(sum,after.get(id)));
     assertEquals(1,count(c,"select count(*) from valet_saved_vehicles where id='60000000-0000-4000-8000-000000000001' and make='Honda'"));assertEquals(2,count(c,"select count(*) from valet_vehicles where saved_vehicle_id='60000000-0000-4000-8000-000000000001'"));assertEquals(1,count(c,"select count(*) from valet_vehicles where operational_active"));
     assertEquals(1,count(c,"select count(*) from valet_requests where saved_vehicle_id='60000000-0000-4000-8000-000000000001' and not active"));
     migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");assertEquals(after,manifest(c));
    }
    // Compare every original column, not the additive metadata.
    assertEquals(0,count(c,"select count(*) from legacy_vehicle_copy old full join valet_vehicles current using(id) where old.id is null or current.id is null or (to_jsonb(current)-'saved_vehicle_id'-'operational_active'-'release_expected_version') is distinct from to_jsonb(old)"));
    assertEquals(0,count(c,"select count(*) from legacy_request_copy old full join valet_requests current using(id) where old.id is null or current.id is null or (to_jsonb(current)-'saved_vehicle_id') is distinct from to_jsonb(old)"));
   }finally{c.setAutoCommit(true);c.setSchema(original);sql(c,"drop schema "+schema+" cascade");}
  }
 }

}
