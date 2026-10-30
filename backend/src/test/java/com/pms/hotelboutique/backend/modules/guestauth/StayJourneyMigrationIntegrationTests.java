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
class StayJourneyMigrationIntegrationTests {
 @Autowired DataSource db;
 private void migrate(Connection c,String schema,String path)throws Exception {
  c.setSchema(schema);var migration=new SpringLiquibase();migration.setDataSource(new SingleConnectionDataSource(c,true));migration.setDefaultSchema(schema);migration.setLiquibaseSchema(schema);migration.setChangeLog(path);migration.afterPropertiesSet();
 }
 private void sql(Connection c,String text)throws Exception {try(var s=c.createStatement()){s.execute(text);}}
 private Map<String,String> manifest(Connection c)throws Exception {
  var result=new TreeMap<String,String>();try(var s=c.createStatement();var rs=s.executeQuery("select id,md5sum from databasechangelog")){while(rs.next())result.put(rs.getString(1),rs.getString(2));}return result;
 }
 private int count(Connection c,String query)throws Exception {try(var s=c.createStatement();var rs=s.executeQuery(query)){rs.next();return rs.getInt(1);}}
 @Test void upgradePreservesLedgerAndChecksumsAndReappliesWithoutInventingDocuments()throws Exception {
  try(var c=db.getConnection()){
   String original=c.getSchema(),schema="journey_upgrade_"+UUID.randomUUID().toString().replace("-","");sql(c,"create schema "+schema);
   try{
    migrate(c,schema,"classpath:db/changelog/db.changelog-before-stay-journey.yaml");var before=manifest(c);
    sql(c,"INSERT INTO reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES ('10000000-0000-4000-8000-000000000001','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','MIG-JOURNEY','CONFIRMED','GTQ','WEB_DIRECTA',now(),now())");
    sql(c,"INSERT INTO folios(id,property_id,type,status,reservation_id,currency,created_at,updated_at) VALUES ('20000000-0000-4000-8000-000000000001','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','GUEST','OPEN','10000000-0000-4000-8000-000000000001','GTQ',now(),now())");
    sql(c,"INSERT INTO folio_movements(id,folio_id,kind,amount_minor,currency,description,created_at) VALUES ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','CHARGE',5400,'GTQ','Historical accommodation',now())");
    sql(c,"create table original_folios as select * from folios");sql(c,"create table original_movements as select * from folio_movements");
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");var after=manifest(c);assertEquals(before.size()+2,after.size());assertTrue(after.containsKey("005-stay-journey-009"));assertTrue(after.containsKey("005-stay-document-files-010"));assertEquals(0,count(c,"select count(*) from stay_document_files"));before.forEach((id,hash)->assertEquals(hash,after.get(id)));
    assertEquals(0,count(c,"select count(*) from ((select * from folio_movements except select * from original_movements) union all (select * from original_movements except select * from folio_movements)) changed"));
    assertEquals(0,count(c,"select count(*) from ((select * from folios except select * from original_folios) union all (select * from original_folios except select * from folios)) changed"));
    assertEquals(0,count(c,"select count(*) from stay_informative_documents"));assertEquals(0,count(c,"select count(*) from simulated_folio_payments"));
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");assertEquals(after,manifest(c));
   }finally{c.setSchema(original);sql(c,"drop schema "+schema+" cascade");}
  }
 }
}
