package com.pms.hotelboutique.backend.modules.securityauth;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.email.StaffInvitationMailer;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.AuthAuditEventRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffSecurityLocks;
import java.net.*;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import tools.jackson.databind.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Focused socket HTTP + disposable PostgreSQL; mail boundary captured in memory. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "pms.staff.invitation-url=http://localhost:3111/activar-staff"})
class StaffInvitationHttpIntegrationTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired StaffJwtService jwt;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    @Autowired Environment env;
    @MockitoSpyBean StaffInvitationMailer mail;
    @MockitoSpyBean AuthAuditEventRepository audit;
    @MockitoSpyBean StaffSecurityLocks locks;
    UUID org,property,admin,target;
    String token,name,email;
    final java.util.concurrent.atomic.AtomicReference<String> deliveredToken=new java.util.concurrent.atomic.AtomicReference<>();
    HttpClient client;
    @BeforeEach void fixtures()throws Exception{
        deliveredToken.set(null);
        doAnswer(call->{deliveredToken.set(call.getArgument(1));return null;}).when(mail).send(anyString(),anyString());
        client=HttpClient.newHttpClient();org=UUID.randomUUID();property=UUID.randomUUID();admin=UUID.randomUUID();name="invite_"+UUID.randomUUID().toString().substring(0,8);email=name+"@qa.test";
        jdbc.update("insert into organizations(id,name,code,status,created_at,updated_at) values(?,'Invitation QA',?,'ACTIVE',now(),now())",org,"QA-"+org);
        jdbc.update("insert into properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) values(?,?,?,'Hotel QA','America/Guatemala','GTQ','ACTIVE',now(),now())",property,org,"QA-"+property);
        jdbc.update("insert into staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) values(?,?,?,?,?,'ACTIVE',now(),now())",admin,"admin_"+name,"admin_"+email,passwords.encode("QA-Known-Admin1!"),"SUPER_ADMIN");
        jdbc.update("insert into organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) values(?,?,'SUPER_ADMIN','ACTIVE',now(),now())",admin,org);
        UUID session=UUID.randomUUID();jdbc.update("insert into auth_sessions(id,context,staff_user_id,status,expires_at,created_at) values(?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())",session,admin);
        token=jwt.issue(new StaffPrincipal(admin,session,"admin_"+name,"SUPER_ADMIN"),Instant.now());
        var created=send("POST","/api/v1/staff-admin/users?"+scope(),Map.of("username",name,"workEmail",email,"roleCode","RECEPCION","propertyIds",List.of(property)),token);
        status(created,201);target=UUID.fromString(json.readTree(created.body()).path("id").asText());
    }
    @AfterEach void close(){client.close();}
    String scope(){return "scope=PROPERTY&propertyId="+property;}
    String path(){return "/api/v1/staff-admin/users/"+target;}
    HttpResponse<String> invite(long version)throws Exception{return send("POST",path()+"/invitation?"+scope(),Map.of("expectedVersion",version),token);}
    HttpResponse<String> consume(String secret)throws Exception{return send("POST","/api/v1/staff-auth/invitations/consume",Map.of("token",secret,"password","QA-New-Staff1!"),null);}
    HttpResponse<String> activate(long version)throws Exception{return send("PATCH",path()+"/status?"+scope(),Map.of("status","ACTIVE","expectedVersion",version),token);}
    JsonNode info()throws Exception{var r=send("GET",path()+"/invitation?"+scope(),null,token);status(r,200);return json.readTree(r.body());}
    long version(){return jdbc.queryForObject("select version from staff_users where id=?",Long.class,target);}
    String state(){return jdbc.queryForObject("select status from staff_users where id=?",String.class,target);}
    long flows(){return jdbc.queryForObject("select count(*) from staff_invitation_flows where staff_user_id=?",Long.class,target);}
    void status(HttpResponse<String> r,int expected){assertEquals(expected,r.statusCode(),r.body());assertEquals("private, no-store",r.headers().firstValue("cache-control").orElse(""));}
    String mailToken(){assertNotNull(deliveredToken.get());return deliveredToken.get();}
    @Test void capturedMailConsumptionM08InitialActivationAndPasswordLogin()throws Exception{
        assertTrue(info().path("invitationAllowed").asBoolean());assertFalse(info().path("activationAllowed").asBoolean());
        status(activate(0),409);status(invite(0),200);assertEquals(1,version());
        String secret=mailToken();String hash=jdbc.queryForObject("select token_hash from staff_invitation_flows where staff_user_id=?",String.class,target);
        assertEquals(StaffInvitationService.hash(secret),hash);assertNotEquals(secret,hash);
        assertEquals(401,send("POST","/api/v1/staff-auth/sessions",Map.of("email",email,"password","QA-New-Staff1!"),null).statusCode());
        var consumed=consume(secret);status(consumed,200);assertTrue(consumed.headers().allValues("set-cookie").isEmpty());
        assertEquals("ACTIVE",state());assertEquals(2,version());
        assertEquals(false,jdbc.queryForObject("select initial_activation_pending from staff_users where id=?",Boolean.class,target));
        assertEquals(0,jdbc.queryForObject("select count(*) from auth_sessions where staff_user_id=?",Integer.class,target));
        assertTrue(passwords.matches("QA-New-Staff1!",jdbc.queryForObject("select password_hash from staff_users where id=?",String.class,target)));
        assertFalse(info().path("activationAllowed").asBoolean());
        assertEquals(1,jdbc.queryForObject("select count(*) from auth_audit_events where staff_user_id=? and event_type='STAFF_INVITATION_ACTIVATED' and actor_id=? and organization_id=? and scope_kind='ORGANIZATION'",Integer.class,target,target,org));
        status(activate(1),409);
        assertEquals(201,send("POST","/api/v1/staff-auth/sessions",Map.of("email",email,"password","QA-New-Staff1!"),null).statusCode());
        assertEquals(1,jdbc.queryForObject("select count(*) from auth_audit_events where staff_user_id=? and event_type='STAFF_INVITATION_CONSUMED' and actor_id=? and organization_id=? and scope_kind='ORGANIZATION'",Integer.class,target,target,org));
        status(send("PATCH",path()+"/status?"+scope(),Map.of("status","SUSPENDED","expectedVersion",2),token),200);
        assertTrue(info().path("activationAllowed").asBoolean());
        status(activate(2),409);status(activate(3),200);assertEquals("ACTIVE",state());assertEquals(4,version());
        var detail=send("GET",path()+"?"+scope(),null,token);status(detail,200);assertEquals("ACTIVE",json.readTree(detail.body()).path("item").path("status").asText());
        status(consume(secret),409);
    }
    @Test void consumptionIsOneUseEvenWithConcurrentRequests()throws Exception{
        status(invite(0),200);String secret=mailToken();
        try(var pool=Executors.newFixedThreadPool(2)){
            var first=pool.submit(()->consume(secret));var second=pool.submit(()->consume(secret));
            assertEquals(Set.of(200,409),Set.of(first.get().statusCode(),second.get().statusCode()));
        }
        assertEquals(2,version());status(consume(secret),409);assertEquals("ACTIVE",state());
    }
    @Test void emailChangeRevokesInvitationAndClearsPreparation()throws Exception{
        status(invite(0),200);String secret=mailToken();status(consume(secret),200);
        status(send("PATCH",path()+"?"+scope(),Map.of("workEmail","new_"+email,"expectedVersion",2),token),200);
        assertFalse(info().path("credentialPrepared").asBoolean());status(activate(3),409);status(consume(secret),409);
        assertNull(jdbc.queryForObject("select credential_prepared_flow_id from staff_users where id=?",UUID.class,target));
    }
    @Test void expiredTokenAndDisabledAccountCannotPrepareOrActivate()throws Exception{
        status(invite(0),200);String secret=mailToken();
        jdbc.update("update staff_invitation_flows set created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where staff_user_id=?",target);
        status(consume(secret),409);
        status(send("PATCH",path()+"/status?"+scope(),Map.of("status","DISABLED","expectedVersion",1),token),200);
        status(consume(secret),409);status(activate(2),409);status(invite(2),409);assertEquals("DISABLED",state());
    }
    @Test void consumptionRequiresActiveMembershipAndPropertiesAndRollsBackCompletely()throws Exception{
        status(invite(0),200);String secret=mailToken();
        String before=jdbc.queryForObject("select password_hash from staff_users where id=?",String.class,target);
        jdbc.update("update organization_memberships set status='INACTIVE' where staff_user_id=?",target);
        status(consume(secret),409);
        jdbc.update("update organization_memberships set status='ACTIVE' where staff_user_id=?",target);
        jdbc.update("update properties set status='INACTIVE' where id=?",property);
        status(consume(secret),409);
        jdbc.update("update properties set status='ACTIVE' where id=?",property);
        status(send("PUT",path()+"/membership?scope=ALL_PROPERTIES",Map.of("roleCode","RECEPCION","propertyIds",List.of(),"expectedVersion",1),token),200);
        status(consume(secret),409);assertEquals("SUSPENDED",state());assertEquals(2,version());
        assertEquals(before,jdbc.queryForObject("select password_hash from staff_users where id=?",String.class,target));
        assertNull(jdbc.queryForObject("select consumed_at from staff_invitation_flows where staff_user_id=?",Instant.class,target));
        assertNull(jdbc.queryForObject("select credential_prepared_at from staff_users where id=?",Instant.class,target));
    }
    @Test void smtpFailureRollsBackAndDoesNotClaimSuccessfulDelivery()throws Exception{
        doThrow(new StaffAdminMutationException(StaffAdminMutationException.Failure.STAFF_WRITE_UNAVAILABLE)).when(mail).send(anyString(),anyString());
        status(invite(0),503);assertEquals(0,version());assertEquals(0,flows());
        assertEquals(0,jdbc.queryForObject("select count(*) from auth_audit_events where staff_user_id=? and event_type='STAFF_INVITATION_SENT'",Integer.class,target));
    }
    @Test void auditFailureRollsBackBeforeSmtp()throws Exception{
        doThrow(new IllegalStateException("QA audit failure")).when(audit).flush();
        status(invite(0),503);assertEquals(0,version());assertEquals(0,flows());verify(mail,never()).send(anyString(),anyString());
    }
    @Test void consumptionAuditFailureRollsBackPasswordEvidenceAndToken()throws Exception{
        status(invite(0),200);String secret=mailToken();
        String before=jdbc.queryForObject("select password_hash from staff_users where id=?",String.class,target);
        doThrow(new IllegalStateException("QA consume audit failure")).when(audit).flush();
        status(consume(secret),503);assertEquals(1,version());assertEquals("SUSPENDED",state());
        assertEquals(before,jdbc.queryForObject("select password_hash from staff_users where id=?",String.class,target));
        assertNull(jdbc.queryForObject("select consumed_at from staff_invitation_flows where staff_user_id=?",Instant.class,target));
        assertNull(jdbc.queryForObject("select credential_prepared_at from staff_users where id=?",Instant.class,target));
        assertEquals(0,jdbc.queryForObject("select count(*) from auth_audit_events where staff_user_id=? and event_type='STAFF_INVITATION_ACTIVATED'",Integer.class,target));
        reset(audit);status(consume(secret),200);assertEquals("ACTIVE",state());
    }
    @Test void loginBeforeOrAfterActivationUsesTheSharedUserLock()throws Exception{
        status(invite(0),200);String secret=mailToken();
        // Login owns the user lock first: it observes SUSPENDED and cannot create a session.
        var entered=new CountDownLatch(1);var release=new CountDownLatch(1);var first=new java.util.concurrent.atomic.AtomicBoolean();
        doAnswer(call->{Collection<UUID> ids=call.getArgument(0);call.callRealMethod();
            if(ids.size()==1&&ids.contains(target)&&first.compareAndSet(false,true)){entered.countDown();assertTrue(release.await(10,TimeUnit.SECONDS));}return null;
        }).when(locks).users(anyCollection());
        try(var pool=Executors.newFixedThreadPool(2)){
            var login=pool.submit(()->send("POST","/api/v1/staff-auth/sessions",Map.of("email",email,"password","QA-New-Staff1!"),null));
            assertTrue(entered.await(5,TimeUnit.SECONDS));var activation=pool.submit(()->consume(secret));
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(4);boolean waiting=false;
            while(System.nanoTime()<deadline){if(jdbc.queryForObject("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock'",Integer.class)>0){waiting=true;break;}Thread.yield();}
            release.countDown();assertTrue(waiting,"Activation must wait for the same user lock");assertEquals(401,login.get().statusCode());status(activation.get(),200);
        }
        assertEquals(201,send("POST","/api/v1/staff-auth/sessions",Map.of("email",email,"password","QA-New-Staff1!"),null).statusCode());
        status(send("PATCH",path()+"/status?"+scope(),Map.of("status","SUSPENDED","expectedVersion",2),token),200);
        assertEquals(0,jdbc.queryForObject("select count(*) from auth_sessions where staff_user_id=? and status='ACTIVE'",Integer.class,target));
        assertEquals(0,jdbc.queryForObject("select count(*) from refresh_tokens t join auth_sessions s on s.id=t.session_id where s.staff_user_id=? and t.revoked_at is null",Integer.class,target));
    }
    @Test void legacyAccountRequiresExplicitRecoveryAndUnknownFieldsAreRejected()throws Exception{
        status(send("POST",path()+"/invitation?"+scope(),Map.of("expectedVersion",0),null),401);
        status(send("POST",path()+"/invitation?"+scope(),Map.of("expectedVersion",0,"credentialReady",true),token),400);
        jdbc.update("update staff_users set initial_activation_pending=false where id=?",target);
        status(activate(0),409);assertTrue(info().path("invitationAllowed").asBoolean());
        status(invite(0),200);String secret=mailToken();status(consume(secret),200);assertEquals("ACTIVE",state());
        status(send("POST","/api/v1/staff-auth/invitations/consume",Map.of("token","x".repeat(43),"password","short"),null),400);
    }
    @Test void enforcesScopeAndNeverExposesTheInvitationToTheAdministrator()throws Exception{
        var response=invite(0);status(response,200);assertEquals(Set.of("organizationId","staffUserId","version","changed"),json.readTree(response.body()).propertyNames());
        assertFalse(response.body().contains(mailToken()));status(invite(1),409);
        UUID other=UUID.randomUUID();
        status(send("GET",path()+"/invitation?scope=PROPERTY&propertyId="+other,null,token),403);
        status(send("GET","/api/v1/staff-admin/users/"+UUID.randomUUID()+"/invitation?"+scope(),null,token),404);
    }
    @Test void suspensionInvalidatesOldPendingInvitationAndOnlyNewRecoveryCanActivate()throws Exception{
        status(invite(0),200);String old=mailToken();
        // Existing ACTIVE account with an unconsumed link, before an administrative suspension.
        jdbc.update("update staff_users set status='ACTIVE',initial_activation_pending=false where id=?",target);
        status(send("PATCH",path()+"/status?"+scope(),Map.of("status","SUSPENDED","expectedVersion",1),token),200);
        assertNotNull(jdbc.queryForObject("select revoked_at from staff_invitation_flows where staff_user_id=?",Instant.class,target));
        status(consume(old),409);status(activate(2),409);
        assertTrue(info().path("invitationAllowed").asBoolean());status(invite(2),200);String recovery=mailToken();assertNotEquals(old,recovery);
        status(consume(old),409);status(consume(recovery),200);assertEquals("ACTIVE",state());assertEquals(4,version());
        status(send("PATCH",path()+"/status?"+scope(),Map.of("status","DISABLED","expectedVersion",4),token),200);
        status(activate(5),409);status(invite(5),409);status(consume(recovery),409);
    }
    @Test void reactivationAuditFailureRollsBackStateAndVersion()throws Exception{
        status(invite(0),200);status(consume(mailToken()),200);
        status(send("PATCH",path()+"/status?"+scope(),Map.of("status","SUSPENDED","expectedVersion",2),token),200);
        doThrow(new IllegalStateException("QA audit failure")).when(audit).flush();
        status(activate(3),503);assertEquals("SUSPENDED",state());assertEquals(3,version());
        reset(audit);status(activate(3),200);assertEquals("ACTIVE",state());
    }
    @Test void recoveryProtectsSuperAdminSelfAndEffectivePermission()throws Exception{
        status(send("POST","/api/v1/staff-admin/users/"+admin+"/invitation?scope=ALL_PROPERTIES",Map.of("expectedVersion",0),token),403);
        status(send("PATCH","/api/v1/staff-admin/users/"+admin+"/status?scope=ALL_PROPERTIES",Map.of("status","ACTIVE","expectedVersion",0),token),403);
        jdbc.update("update staff_users set role_code='RECEPCION' where id=?",admin);
        jdbc.update("update organization_memberships set role_code='RECEPCION' where staff_user_id=?",admin);
        jdbc.update("insert into membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) values(?,?,?,'ACTIVE',now(),now())",admin,org,property);
        status(invite(0),403);status(activate(0),403);assertEquals("SUSPENDED",state());assertEquals(0,flows());
    }
    HttpResponse<String> send(String method,String path,Object body,String authorization)throws Exception{
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+env.getRequiredProperty("local.server.port")+path)).timeout(java.time.Duration.ofSeconds(25));
        if(authorization!=null)request.header("Authorization","Bearer "+authorization);
        if(body!=null)request.header("Content-Type","application/json");
        request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return client.send(request.build(),HttpResponse.BodyHandlers.ofString());
    }
}
