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
class AmenitiesMigrationIntegrationTests {
 @Autowired DataSource db;
 private void migrate(Connection c,String schema,String path)throws Exception {
  c.setSchema(schema);var migration=new SpringLiquibase();migration.setDataSource(new SingleConnectionDataSource(c,true));migration.setDefaultSchema(schema);migration.setLiquibaseSchema(schema);migration.setChangeLog(path);migration.afterPropertiesSet();
 }
 private void sql(Connection c,String text)throws Exception {try(var s=c.createStatement()){s.execute(text);}}
 private Map<String,String> manifest(Connection c)throws Exception {
  var result=new TreeMap<String,String>();try(var s=c.createStatement();var rs=s.executeQuery("select id,md5sum from databasechangelog")){while(rs.next())result.put(rs.getString(1),rs.getString(2));}return result;
 }
 private int count(Connection c,String query)throws Exception {try(var s=c.createStatement();var rs=s.executeQuery(query)){rs.next();return rs.getInt(1);}}
 @Test void upgradeFromCurrentMainPreservesHistoricalDataChecksumsAndProvisionsAllProperties()throws Exception {
  try(var c=db.getConnection()) {
   String original=c.getSchema(),schema="amenities_upgrade_"+UUID.randomUUID().toString().replace("-","");sql(c,"create schema "+schema);
   var current=manifest(c);var predecessor=new TreeMap<>(current);predecessor.keySet().removeAll(java.util.Set.of("005-operations-006","005-operations-007","005-operations-008"));
   try {
    migrate(c,schema,"classpath:db/changelog/db.changelog-before-amenities.yaml");var before=manifest(c);assertEquals(predecessor,before);
    sql(c,"insert into service_requests(id,property_id,category,subject,priority,status,created_at,updated_at) values ('00000000-0000-4000-8000-000000000001','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','HOUSEKEEPING','Historical housekeeping','MEDIUM','DONE',now(),now()),('00000000-0000-4000-8000-000000000002','3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d','ROOM_SERVICE','Historical room service','MEDIUM','OPEN',now(),now())");
    sql(c,"create table historical_services_snapshot as select * from service_requests");
    sql(c,"create table historical_menu_snapshot as select * from room_service_products");
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");var after=manifest(c);assertEquals(current,after);assertTrue(after.containsKey("005-operations-006"));assertTrue(after.containsKey("003-public-reservation-lookup-014"));before.forEach((id,checksum)->assertEquals(checksum,after.get(id)));
    assertEquals(0,count(c,"select count(*) from ((select * from service_requests except select * from historical_services_snapshot) union all (select * from historical_services_snapshot except select * from service_requests)) changes"));
    assertEquals(0,count(c,"select count(*) from ((select * from room_service_products except select * from historical_menu_snapshot) union all (select * from historical_menu_snapshot except select * from room_service_products)) changes"));
    assertEquals(0,count(c,"select count(*) from properties p where (select count(*) from amenities_catalog c where c.property_id=p.id)<>5"));
    int total=count(c,"select count(*) from amenities_catalog");
    sql(c,"select provision_amenities_catalog(id) from properties");assertEquals(total,count(c,"select count(*) from amenities_catalog"));
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");assertEquals(after,manifest(c));assertEquals(total,count(c,"select count(*) from amenities_catalog"));
    assertEquals(0,count(c,"select count(*) from amenities_requests"));
    assertEquals(0,count(c,"select count(*) from information_schema.columns where table_schema='"+schema+"' and table_name like 'amenities_%' and column_name in ('price','unit_price_minor','total_minor','currency')"));
   }finally{c.setSchema(original);sql(c,"drop schema "+schema+" cascade");}
  }
 }
}
