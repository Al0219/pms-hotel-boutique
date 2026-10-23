package com.pms.hotelboutique.backend.modules.securityauth;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
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

/** Real socket HTTP + PostgreSQL, with deterministic barriers only around real lock operations. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
class StaffAdminMutationHttpIntegrationTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired ObjectMapper json;
    @Autowired Environment env;
    @Autowired PasswordEncoder passwords;
    @MockitoSpyBean StaffSecurityLocks locks;
    @MockitoSpyBean StaffAdminMutationRepository writes;
    @MockitoSpyBean AuthAuditEventRepository audit;
    UUID org,otherOrg,p1,p2,p3,otherProperty,inactive,admin,manager,target,suspended,partial,foreign;
    String adminToken,managerToken,suffix;
    static String passwordHash;
    static final String PASSWORD="QA-staff-known-password1!";
    final Map<UUID,StaffPrincipal> principals=new HashMap<>();
    HttpClient client;
    @BeforeEach void fixtures(){
        client=HttpClient.newHttpClient();suffix=UUID.randomUUID().toString().substring(0,8);if(passwordHash==null)passwordHash=passwords.encode(PASSWORD);
        org=organization();otherOrg=organization();p1=property(org,"ACTIVE");p2=property(org,"ACTIVE");p3=property(org,"ACTIVE");inactive=property(org,"INACTIVE");otherProperty=property(otherOrg,"ACTIVE");
        admin=staff(org,"SUPER_ADMIN","ACTIVE","ACTIVE");manager=staff(org,"GERENCIA","ACTIVE","ACTIVE",p1,p2);
        target=staff(org,"RECEPCION","ACTIVE","ACTIVE",p1,p2);suspended=staff(org,"RECEPCION","SUSPENDED","ACTIVE",p1);
        partial=staff(org,"RECEPCION","ACTIVE","ACTIVE",p1,p3);foreign=staff(otherOrg,"RECEPCION","ACTIVE","ACTIVE",otherProperty);
        adminToken=token(admin);managerToken=token(manager);
    }
    @AfterEach void close(){client.close();}
    @Test void effectiveEmailChangeHasMinimalResultAndOrganizationalActorSubjectAudit()throws Exception{
        var response=command("PATCH",target,"",email("  New@Hotel.example  ",0),managerToken,"scope=PROPERTY&propertyId="+p1);ok(response,200);
        var result=json.readTree(response.body());assertEquals(Set.of("organizationId","staffUserId","version","changed"),result.propertyNames());
        assertEquals(org.toString(),result.path("organizationId").asText());assertEquals(target.toString(),result.path("staffUserId").asText());assertEquals(1,result.path("version").asInt());assertTrue(result.path("changed").asBoolean());
        assertEquals("new@"+suffix+".example",value("work_email",target));assertEquals(1,version(target));assertRevoked(target);
        var events=jdbc.queryForList("select actor_context,actor_id,staff_user_id,organization_id,scope_kind,property_id,correlation_id,detail from auth_audit_events where staff_user_id=?",target);
        assertEquals(2,events.size());Set<Object> correlations=new HashSet<>();
        for(var event:events){assertEquals("STAFF",event.get("actor_context"));assertEquals(manager,event.get("actor_id"));assertEquals(target,event.get("staff_user_id"));assertEquals(org,event.get("organization_id"));assertEquals("ORGANIZATION",event.get("scope_kind"));assertNull(event.get("property_id"));correlations.add(event.get("correlation_id"));assertEquals("administrative_change",event.get("detail"));}assertEquals(1,correlations.size());
        assertFalse(response.body().matches("(?s).*(password|token|sessionId|new@).*"));
    }
    @Test void noOpPreservesVersionDatesSessionsTokensAndAuditButStaleVersionAlwaysConflicts()throws Exception{
        var login=login(target);String refresh=login.path("refreshToken").asText();var before=jdbc.queryForMap("select version,updated_at from staff_users where id=?",target);
        ok(command("PATCH",target,"",email(value("work_email",target),0),adminToken),200);
        ok(command("PUT",target,"/membership",membership("RECEPCION",0,p2,p1),adminToken),200);
        assertEquals(before,jdbc.queryForMap("select version,updated_at from staff_users where id=?",target));assertEquals(0,count("select count(*) from auth_audit_events where event_type like 'STAFF_%_UPDATED' and staff_user_id=?",target));
        ok(refresh(refresh),200);
        ok(command("PATCH",target,"",email("changed@hotel.example",0),adminToken),200);
        var stale=command("PATCH",target,"",email("changed@hotel.example",0),adminToken);ok(stale,409);assertEquals("STAFF_VERSION_CONFLICT",code(stale));
    }
    @Test void membershipReplacementPreservesHistoryAndMayLeaveTheSelectedProperty()throws Exception{
        var oldCreated=jdbc.queryForObject("select created_at from membership_properties where staff_user_id=? and property_id=?",Instant.class,target,p1);
        ok(command("PUT",target,"/membership",membership("OPERACIONES",0,p2),managerToken,"scope=PROPERTY&propertyId="+p1),200);
        assertEquals("OPERACIONES",value("role_code",target));assertEquals("OPERACIONES",jdbc.queryForObject("select role_code from organization_memberships where staff_user_id=?",String.class,target));
        assertEquals("ACTIVE",jdbc.queryForObject("select status from organization_memberships where staff_user_id=?",String.class,target));
        assertEquals("INACTIVE",jdbc.queryForObject("select status from membership_properties where staff_user_id=? and property_id=?",String.class,target,p1));
        assertEquals(oldCreated,jdbc.queryForObject("select created_at from membership_properties where staff_user_id=? and property_id=?",Instant.class,target,p1));assertEquals(1,version(target));
        ok(get(target,managerToken,"scope=PROPERTY&propertyId="+p1),404);ok(get(target,managerToken,"scope=PROPERTY&propertyId="+p2),200);
    }
    @Test void appliesEveryAssignableRoleWithoutCreatingMembershipOrPromotingSuperAdmin()throws Exception{
        long v=0;for(String role:List.of("GERENCIA","OPERACIONES","AUDITOR","RECEPCION")){
            ok(command("PUT",target,"/membership",membership(role,v++,p1,p2),managerToken),200);assertEquals(role,value("role_code",target));
            assertEquals(role,jdbc.queryForObject("select role_code from organization_memberships where staff_user_id=?",String.class,target));
        }
        assertEquals(1,count("select count(*) from organization_memberships where staff_user_id=?",target));
        ok(command("PUT",target,"/membership",membership("SUPER_ADMIN",v,p1),adminToken),400);
    }
    @Test void suspendedInactiveMembershipCanChangeAssignmentsWithoutBecomingActive()throws Exception{
        jdbc.update("update organization_memberships set status='INACTIVE' where staff_user_id=?",suspended);
        ok(command("PUT",suspended,"/membership",membership("AUDITOR",0,p1,p2),managerToken),200);
        assertEquals("INACTIVE",jdbc.queryForObject("select status from organization_memberships where staff_user_id=?",String.class,suspended));assertEquals("SUSPENDED",value("status",suspended));
    }
    @Test void onlySuperAdminAllCanEmptySuspendedAssignmentsAndActiveCannotBeEmptied()throws Exception{
        ok(command("PUT",target,"/membership",membership("RECEPCION",0),adminToken),409);
        ok(command("PUT",suspended,"/membership",membership("RECEPCION",0),managerToken),409);
        ok(command("PUT",suspended,"/membership",membership("RECEPCION",0),adminToken,"scope=PROPERTY&propertyId="+p1),409);
        ok(command("PUT",suspended,"/membership",membership("RECEPCION",0),adminToken),200);
        ok(get(suspended,managerToken,"scope=ALL_PROPERTIES"),404);
        ok(command("PUT",suspended,"/membership",membership("RECEPCION",1,p2),adminToken),200);
    }
    @Test void deniesForeignPartialUnknownAndProtectedTargetsWithoutExistenceLeaks()throws Exception{
        String missing=command("PATCH",UUID.randomUUID(),"",email("unused@hotel.example",0),managerToken).body();
        for(UUID id:List.of(foreign,partial,admin)){
            var r=command("PATCH",id,"",email("unused@hotel.example",0),managerToken);ok(r,404);assertEquals(missing,r.body());
        }
        ok(command("PATCH",foreign,"",email("unused@hotel.example",0),adminToken),404);
        ok(command("PUT",target,"/membership",membership("RECEPCION",0,p1,p3),managerToken),403);
        ok(command("PUT",target,"/membership",membership("RECEPCION",0,otherProperty),adminToken),403);
        ok(command("PUT",target,"/membership",membership("RECEPCION",0,inactive),adminToken),403);
    }
    @Test void prohibitsEverySelfEditAndSuperAdminAccessOrStateChange()throws Exception{
        ok(command("PATCH",admin,"",email(value("work_email",admin),0),adminToken),403);
        ok(command("PUT",admin,"/membership",membership("GERENCIA",0,p1),adminToken),403);
        ok(command("PATCH",admin,"/status",status("SUSPENDED",0),adminToken),403);
        UUID second=staff(org,"SUPER_ADMIN","ACTIVE","ACTIVE");
        ok(command("PUT",second,"/membership",membership("GERENCIA",0,p1),adminToken),403);
        ok(command("PATCH",second,"/status",status("DISABLED",0),adminToken),403);
        ok(command("PATCH",second,"",email("otheradmin@hotel.example",0),adminToken),200);
        assertEquals("ACTIVE",value("status",second));
    }
    @Test void acceptsSuspensionAndDisableButNeverReactivationOrEditingDisabledAccounts()throws Exception{
        ok(command("PATCH",target,"/status",status("SUSPENDED",0),adminToken),200);
        var noop=command("PATCH",target,"/status",status("SUSPENDED",1),adminToken);ok(noop,200);assertFalse(json.readTree(noop.body()).path("changed").asBoolean());
        ok(command("PATCH",target,"/status",status("ACTIVE",1),adminToken),400);
        ok(command("PATCH",target,"/status",status("DISABLED",1),adminToken),200);
        ok(command("PATCH",target,"/status",status("SUSPENDED",2),adminToken),409);
        ok(command("PATCH",target,"/status",status("ACTIVE",2),adminToken),400);
        ok(command("PATCH",target,"",email("disabled@hotel.example",2),adminToken),409);
        ok(command("PUT",target,"/membership",membership("AUDITOR",2,p1),adminToken),409);
        ok(command("PATCH",target,"/status",status("DISABLED",2),adminToken),200);
        ok(command("PATCH",suspended,"/status",status("DISABLED",0),adminToken),200);
        UUID active=staff(org,"RECEPCION","ACTIVE","ACTIVE",p1);ok(command("PATCH",active,"/status",status("DISABLED",0),adminToken),200);
        assertEquals(2,version(target));assertEquals(1,count("select count(*) from staff_users where id=?",target));assertRevoked(target);
    }
    @Test void normalizedDuplicateAcrossOrganizationsIsSanitizedAndDoesNotRevokeTarget()throws Exception{
        var r=command("PATCH",target,"",email(" "+value("work_email",foreign).toUpperCase(Locale.ROOT)+" ",0),adminToken);ok(r,409);assertEquals("STAFF_EMAIL_CONFLICT",code(r));assertEquals(0,version(target));assertEquals(0,count("select count(*) from auth_sessions where staff_user_id=? and status='REVOKED'",target));assertFalse(r.body().contains(foreign.toString()));
    }
    @Test void rejectsUnprivilegedAbsentGuestExpiredAndRevokedSessions()throws Exception{
        for(String role:List.of("RECEPCION","OPERACIONES","AUDITOR")){UUID u=staff(org,role,"ACTIVE","ACTIVE",p1);ok(command("PATCH",target,"/status",status("SUSPENDED",0),token(u)),403);}
        ok(command("PATCH",target,"/status",status("SUSPENDED",0),null),401);
        String guest=guestJwt.issue(new GuestPrincipal(UUID.randomUUID(),UUID.randomUUID(),"guest@example.test"),Instant.now());ok(command("PATCH",target,"/status",status("SUSPENDED",0),guest),401);
        ok(command("PATCH",target,"/status",status("SUSPENDED",0),jwt.issue(principals.get(admin),Instant.now().minusSeconds(86400))),401);
        jdbc.update("update auth_sessions set status='REVOKED',revoked_at=now() where staff_user_id=?",manager);
        ok(command("PATCH",target,"/status",status("SUSPENDED",0),managerToken),401);assertEquals(0,version(target));
    }
    @Test void enforcesStrictBodyQueryMediaTypeSizeAndUnsupportedMethods()throws Exception{
        for(String body:List.of("{}","{\"status\":\"SUSPENDED\",\"status\":\"DISABLED\",\"expectedVersion\":0}","{\"status\":\"SUSPENDED\",\"expectedVersion\":0,\"organizationId\":\""+otherOrg+"\"}","{\"status\":\"ACTIVE\",\"expectedVersion\":0}"))ok(command("PATCH",target,"/status",body,adminToken),400);
        for(String query:List.of("","scope=ALL_PROPERTIES&limit=1","scope=ALL_PROPERTIES&organizationId="+org,"scope=ALL_PROPERTIES&scope=ALL_PROPERTIES"))ok(command("PATCH",target,"/status",status("SUSPENDED",0),adminToken,query),400);
        ok(send("PATCH","/api/v1/staff-admin/users/"+target+"/status?scope=ALL_PROPERTIES",status("SUSPENDED",0),adminToken,"text/plain"),415);
        ok(command("PATCH",target,"/status"," ".repeat(65537),adminToken),413);
        for(String method:List.of("POST","DELETE","OPTIONS")){var r=command(method,target,"/membership","{}",adminToken);ok(r,405);assertEquals("PUT",r.headers().firstValue("allow").orElse(""));}
        assertEquals(0,version(target));
    }
    @Test void revokesAllSessionsAndRefreshFamiliesIncludingPreviouslyRotatedTokens()throws Exception{
        var first=login(target);var second=login(target);ok(refresh(first.path("refreshToken").asText()),200);
        assertTrue(count("select count(distinct family_id) from refresh_tokens where session_id in(select id from auth_sessions where staff_user_id=?)",target)>=2);
        ok(command("PUT",target,"/membership",membership("OPERACIONES",0,p1),adminToken),200);assertRevoked(target);
        ok(refresh(second.path("refreshToken").asText()),401);
        ok(send("GET","/api/v1/staff-auth/session",null,first.path("accessToken").asText(),null),401);
    }
    @Test void rollbackAfterRevocationRestoresUserMembershipVersionSessionsAndEvents()throws Exception{
        var logged=login(target);var before=jdbc.queryForMap("select role_code,status,version,work_email,updated_at from staff_users where id=?",target);long events=count("select count(*) from auth_audit_events where staff_user_id=?",target);
        doAnswer(inv->{inv.callRealMethod();throw new IllegalStateException("QA injected revocation failure");}).when(writes).revokeSessions(target);
        ok(command("PUT",target,"/membership",membership("AUDITOR",0,p2),adminToken),503);
        assertEquals(before,jdbc.queryForMap("select role_code,status,version,work_email,updated_at from staff_users where id=?",target));assertEquals("RECEPCION",jdbc.queryForObject("select role_code from organization_memberships where staff_user_id=?",String.class,target));assertEquals(2,count("select count(*) from membership_properties where staff_user_id=? and status='ACTIVE'",target));assertEquals(events,count("select count(*) from auth_audit_events where staff_user_id=?",target));ok(refresh(logged.path("refreshToken").asText()),200);
    }
    @Test void auditFailureRollsBackContactAndRevocation()throws Exception{
        var logged=login(target);long events=count("select count(*) from auth_audit_events where staff_user_id=?",target);String before=value("work_email",target);
        doThrow(new IllegalStateException("QA injected audit failure")).when(audit).flush();
        ok(command("PATCH",target,"",email("rollback@hotel.example",0),adminToken),503);
        assertEquals(before,value("work_email",target));assertEquals(0,version(target));assertEquals(events,count("select count(*) from auth_audit_events where staff_user_id=?",target));ok(refresh(logged.path("refreshToken").asText()),200);
    }
    @Test void databaseAuditInsertFailureRollsBackWholeStatusCommand()throws Exception{
        jdbc.execute("create or replace function qa_staff_audit_fail() returns trigger language plpgsql as $$ begin if NEW.staff_user_id='"+target+"'::uuid and NEW.event_type='STAFF_STATUS_CHANGED' then raise exception 'QA audit insert unavailable'; end if; return NEW; end $$");
        jdbc.execute("create trigger qa_staff_audit_fail before insert on auth_audit_events for each row execute function qa_staff_audit_fail()");
        try {ok(command("PATCH",target,"/status",status("DISABLED",0),adminToken),503);assertEquals("ACTIVE",value("status",target));assertEquals(0,version(target));assertEquals(0,count("select count(*) from auth_sessions where staff_user_id=? and status='REVOKED'",target));assertEquals(0,count("select count(*) from auth_audit_events where staff_user_id=?",target));}
        finally {jdbc.execute("drop trigger qa_staff_audit_fail on auth_audit_events");jdbc.execute("drop function qa_staff_audit_fail()");}
    }
    @Test void refreshReplayPersistsFamilyRevocationDespiteReturning401()throws Exception{
        var logged=login(target);String old=logged.path("refreshToken").asText();ok(refresh(old),200);ok(refresh(old),401);assertEquals(0,count("select count(*) from refresh_tokens t join auth_sessions s on s.id=t.session_id where s.staff_user_id=? and t.revoked_at is null",target));
        assertTrue(count("select count(*) from auth_audit_events where staff_user_id=? and event_type='STAFF_SESSION_REVOKED'",target)>0);
    }
    @Test void loginAndRefreshBothOrdersAgainstSuspensionAndDisableAreSerialized()throws Exception{
        for(boolean login:List.of(true,false))for(boolean authHoldsLock:List.of(true,false))for(String requested:List.of("SUSPENDED","DISABLED")){
            UUID subject=staff(org,"RECEPCION","ACTIVE","ACTIVE",p1);JsonNode logged=login?null:login(subject);
            var barrier=pauseUser(subject,authHoldsLock);
            try(var pool=Executors.newFixedThreadPool(2)){
                var auth=pool.submit(()->login?rawLogin(subject):refresh(logged.path("refreshToken").asText()));
                assertTrue(barrier.entered.await(10,TimeUnit.SECONDS));
                var mutation=pool.submit(()->command("PATCH",subject,"/status",status(requested,0),adminToken));
                try {
                    if(authHoldsLock)awaitDatabaseLockWait();
                    else ok(mutation.get(10,TimeUnit.SECONDS),200);
                }finally{barrier.release.countDown();}
                var authResult=auth.get(10,TimeUnit.SECONDS);assertEquals(authHoldsLock?(login?201:200):401,authResult.statusCode(),authResult.body());
                ok(mutation.get(10,TimeUnit.SECONDS),200);assertEquals(requested,value("status",subject));assertRevoked(subject);
                if(authHoldsLock){var issued=json.readTree(authResult.body());ok(refresh(issued.path("refreshToken").asText()),401);ok(send("GET","/api/v1/staff-auth/session",null,issued.path("accessToken").asText(),null),401);}
            }finally{barrier.release.countDown();reset(locks);}
        }
    }
    @Test void loginRechecksOldEmailAfterConcurrentContactChange()throws Exception{
        var barrier=pauseUser(target,false);
        try(var pool=Executors.newSingleThreadExecutor()){
            var pending=pool.submit(()->rawLogin(target));assertTrue(barrier.entered.await(10,TimeUnit.SECONDS));
            try{ok(command("PATCH",target,"",email("new-login@hotel.example",0),adminToken),200);}finally{barrier.release.countDown();}
            assertEquals(401,pending.get(10,TimeUnit.SECONDS).statusCode());assertRevoked(target);
        }finally{barrier.release.countDown();}
    }
    @Test void competingRefreshRequestsCannotCreateTwoUsableSuccessors()throws Exception{
        String token=login(target).path("refreshToken").asText();var start=new CyclicBarrier(3);
        try(var pool=Executors.newFixedThreadPool(2)){
            var a=pool.submit(()->{start.await();return refresh(token);});var b=pool.submit(()->{start.await();return refresh(token);});start.await();
            var first=a.get(10,TimeUnit.SECONDS);var second=b.get(10,TimeUnit.SECONDS);assertEquals(Set.of(200,401),Set.of(first.statusCode(),second.statusCode()));
            var issued=json.readTree((first.statusCode()==200?first:second).body());ok(refresh(issued.path("refreshToken").asText()),401);
            assertEquals(0,count("select count(*) from refresh_tokens t join auth_sessions s on s.id=t.session_id where s.staff_user_id=? and t.revoked_at is null",target));
        }
    }
    @Test void logoutAndAdministrativeMutationShareTheSameParentLock()throws Exception{
        var logged=login(target);var barrier=pauseUser(target,true);
        try(var pool=Executors.newFixedThreadPool(2)){
            var logout=pool.submit(()->send("POST","/api/v1/staff-auth/logout",null,logged.path("accessToken").asText(),null));assertTrue(barrier.entered.await(10,TimeUnit.SECONDS));
            var mutation=pool.submit(()->command("PATCH",target,"/status",status("SUSPENDED",0),adminToken));
            try{awaitDatabaseLockWait();}finally{barrier.release.countDown();}
            assertEquals(204,logout.get(10,TimeUnit.SECONDS).statusCode());ok(mutation.get(10,TimeUnit.SECONDS),200);assertRevoked(target);
        }finally{barrier.release.countDown();}
    }
    @Test void simultaneousMutationsWithSameVersionHaveOneWinner()throws Exception{
        var entered=new CountDownLatch(1);var release=new CountDownLatch(1);var once=new AtomicBoolean();
        doAnswer(inv->{if(once.compareAndSet(false,true)){entered.countDown();assertTrue(release.await(10,TimeUnit.SECONDS));}return inv.callRealMethod();}).when(writes).updateUser(eq(target),eq(org),eq(0L),anyString(),anyString());
        try(var pool=Executors.newFixedThreadPool(2)){
            var a=pool.submit(()->command("PATCH",target,"",email("winner@hotel.example",0),adminToken));assertTrue(entered.await(10,TimeUnit.SECONDS));
            var b=pool.submit(()->command("PUT",target,"/membership",membership("AUDITOR",0,p1),managerToken));
            try{awaitDatabaseLockWait();}finally{release.countDown();}
            ok(a.get(10,TimeUnit.SECONDS),200);ok(b.get(10,TimeUnit.SECONDS),409);assertEquals(1,version(target));assertEquals("RECEPCION",value("role_code",target));
        }finally{release.countDown();}
    }
    @Test void actorPermissionIsRevalidatedAfterWaitingForLocks()throws Exception{
        var entered=new CountDownLatch(1);var release=new CountDownLatch(1);var once=new AtomicBoolean();
        doAnswer(inv->{Collection<UUID> ids=inv.getArgument(0);if(ids.size()==2&&ids.contains(manager)&&once.compareAndSet(false,true)){entered.countDown();assertTrue(release.await(10,TimeUnit.SECONDS));}return inv.callRealMethod();}).when(locks).users(anyCollection());
        try(var pool=Executors.newSingleThreadExecutor()){
            var pending=pool.submit(()->command("PATCH",target,"/status",status("SUSPENDED",0),managerToken));assertTrue(entered.await(10,TimeUnit.SECONDS));
            try{jdbc.update("update organization_memberships set role_code='OPERACIONES' where staff_user_id=?",manager);jdbc.update("update staff_users set role_code='OPERACIONES',version=version+1 where id=?",manager);}finally{release.countDown();}
            ok(pending.get(10,TimeUnit.SECONDS),403);assertEquals(0,version(target));assertEquals("ACTIVE",value("status",target));
        }finally{release.countDown();}
    }
    @Test void crossedAdministratorsUseUuidLockOrderAndRevalidateRevokedActor()throws Exception{
        UUID second=staff(org,"SUPER_ADMIN","ACTIVE","ACTIVE");String secondToken=token(second);var start=new CyclicBarrier(3);
        try(var pool=Executors.newFixedThreadPool(2)){
            var a=pool.submit(()->{start.await();return command("PATCH",second,"",email("cross-one@hotel.example",0),adminToken);});
            var b=pool.submit(()->{start.await();return command("PATCH",admin,"",email("cross-two@hotel.example",0),secondToken);});start.await();
            var ar=a.get(10,TimeUnit.SECONDS);var br=b.get(10,TimeUnit.SECONDS);assertEquals(Set.of(200,401),Set.of(ar.statusCode(),br.statusCode()));assertEquals(1,version(admin)+version(second));
        }
    }
    @Test void normalizedContactNoOpDoesNotRevokeLegacyMixedCaseEmail()throws Exception{
        jdbc.update("update staff_users set work_email=? where id=?","  Mixed@"+suffix+".example  ",target);
        var r=command("PATCH",target,"",email("mixed@hotel.example",0),adminToken);ok(r,200);
        assertFalse(json.readTree(r.body()).path("changed").asBoolean());assertEquals(0,version(target));
        assertEquals(1,count("select count(*) from auth_sessions where staff_user_id=? and status='ACTIVE'",target));
        assertEquals(0,count("select count(*) from auth_audit_events where staff_user_id=?",target));
    }
    @Test void concurrentDifferentUsersCannotCommitSameNormalizedEmail()throws Exception{
        UUID another=staff(org,"RECEPCION","ACTIVE","ACTIVE",p1);var start=new CyclicBarrier(3);
        try(var pool=Executors.newFixedThreadPool(2)){
            var a=pool.submit(()->{start.await();return command("PATCH",target,"",email("race@hotel.example",0),adminToken);});
            var b=pool.submit(()->{start.await();return command("PATCH",another,"",email(" RACE@hotel.example ",0),managerToken);});start.await();
            var ar=a.get(10,TimeUnit.SECONDS);var br=b.get(10,TimeUnit.SECONDS);assertEquals(Set.of(200,409),Set.of(ar.statusCode(),br.statusCode()));
            assertEquals("STAFF_EMAIL_CONFLICT",code(ar.statusCode()==409?ar:br));assertEquals(1,version(target)+version(another));
        }
    }

    @Test void staffMutationLeavesSameEmailGuestAccountSessionAndRefreshUntouched()throws Exception{
        UUID guest=UUID.randomUUID(),session=UUID.randomUUID();
        jdbc.update("insert into guest_accounts(id,email,status,email_verified_at,created_at,updated_at) values(?,?,'ACTIVE',now(),now(),now())",guest,value("work_email",target));
        jdbc.update("insert into guest_auth_sessions(id,guest_account_id,status,expires_at,created_at) values(?,?,'ACTIVE',now()+interval '1 day',now())",session,guest);
        jdbc.update("insert into guest_refresh_tokens(id,session_id,token_hash,family_id,expires_at,created_at) values(?,?,?,?,now()+interval '1 day',now())",UUID.randomUUID(),session,UUID.randomUUID().toString(),UUID.randomUUID());
        var account=jdbc.queryForMap("select * from guest_accounts where id=?",guest);
        var before=jdbc.queryForMap("select * from guest_auth_sessions where id=?",session);
        long refresh=count("select count(*) from guest_refresh_tokens where session_id=? and revoked_at is null",session);
        ok(command("PATCH",target,"/status",status("DISABLED",0),adminToken),200);
        assertEquals(account,jdbc.queryForMap("select * from guest_accounts where id=?",guest));
        assertEquals(before,jdbc.queryForMap("select * from guest_auth_sessions where id=?",session));
        assertEquals(refresh,count("select count(*) from guest_refresh_tokens where session_id=? and revoked_at is null",session));
    }

    private record Barrier(CountDownLatch entered,CountDownLatch release){}
    private Barrier pauseUser(UUID subject,boolean hold){
        var barrier=new Barrier(new CountDownLatch(1),new CountDownLatch(1));var once=new AtomicBoolean();
        doAnswer(inv->{Collection<UUID> ids=inv.getArgument(0);if(ids.size()==1&&ids.contains(subject)&&once.compareAndSet(false,true)){
            if(hold)inv.callRealMethod();barrier.entered.countDown();assertTrue(barrier.release.await(10,TimeUnit.SECONDS));if(!hold)inv.callRealMethod();return null;
        }return inv.callRealMethod();}).when(locks).users(anyCollection());return barrier;
    }
    private void awaitDatabaseLockWait(){
        long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(4);
        while(System.nanoTime()<until)if(jdbc.queryForObject("select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like '%staff_users%'",Long.class)>0)return;
        fail("Expected PostgreSQL row-lock wait was not observed");
    }
    UUID organization(){UUID id=UUID.randomUUID();jdbc.update("insert into organizations(id,name,code,status,created_at,updated_at) values(?,'Mutation QA',?,'ACTIVE',now(),now())",id,"QA-"+id);return id;}
    UUID property(UUID org,String state){UUID id=UUID.randomUUID();jdbc.update("insert into properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) values(?,?,?,'QA','America/Guatemala','GTQ',?,now(),now())",id,org,"QA-"+id,state);return id;}
    UUID staff(UUID org,String role,String status,String membership,UUID... properties){
        UUID id=UUID.randomUUID();String name="u"+id;
        jdbc.update("insert into staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) values(?,?,?,?,?,?,now(),now())",id,name,id+"@qa.test",passwordHash,role,status);
        jdbc.update("insert into organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) values(?,?,?,?,now(),now())",id,org,role,membership);
        for(UUID property:properties)jdbc.update("insert into membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) values(?,?,?,'ACTIVE',now(),now())",id,org,property);
        UUID session=UUID.randomUUID();jdbc.update("insert into auth_sessions(id,context,staff_user_id,status,expires_at,created_at) values(?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())",session,id);
        principals.put(id,new StaffPrincipal(id,session,name,role));return id;
    }
    String token(UUID user){return jwt.issue(principals.get(user),Instant.now());}
    long version(UUID user){return jdbc.queryForObject("select version from staff_users where id=?",Long.class,user);}
    String value(String column,UUID user){if(!Set.of("role_code","status","work_email").contains(column))throw new IllegalArgumentException();return jdbc.queryForObject("select "+column+" from staff_users where id=?",String.class,user);}
    long count(String sql,UUID user){return jdbc.queryForObject(sql,Long.class,user);}
    void assertRevoked(UUID subject){assertEquals(0,count("select count(*) from auth_sessions where staff_user_id=? and status='ACTIVE'",subject));assertEquals(0,count("select count(*) from refresh_tokens t join auth_sessions s on s.id=t.session_id where s.staff_user_id=? and t.revoked_at is null",subject));}
    String email(String email,long version){return json.writeValueAsString(Map.of("workEmail",email.replaceAll("(?i)"+java.util.regex.Pattern.quote("@hotel.example"),"@"+suffix+".example"),"expectedVersion",version));}
    String status(String state,long version){return json.writeValueAsString(Map.of("status",state,"expectedVersion",version));}
    String membership(String role,long version,UUID... ids){return json.writeValueAsString(Map.of("roleCode",role,"propertyIds",List.of(ids),"expectedVersion",version));}
    String code(HttpResponse<String> r){return json.readTree(r.body()).path("code").asText();}
    void ok(HttpResponse<String> r,int status){assertEquals(status,r.statusCode(),r.body());if(r.uri().getPath().contains("staff-admin"))assertEquals("private, no-store",r.headers().firstValue("cache-control").orElse(""));}
    HttpResponse<String> command(String method,UUID id,String suffix,String body,String token)throws Exception{return command(method,id,suffix,body,token,"scope=ALL_PROPERTIES");}
    HttpResponse<String> command(String method,UUID id,String suffix,String body,String token,String query)throws Exception{return send(method,"/api/v1/staff-admin/users/"+id+suffix+(query.isEmpty()?"":"?"+query),body,token,"application/json");}
    HttpResponse<String> get(UUID id,String token,String query)throws Exception{return send("GET","/api/v1/staff-admin/users/"+id+"?"+query,null,token,null);}
    HttpResponse<String> rawLogin(UUID id)throws Exception{return send("POST","/api/v1/staff-auth/sessions",json.writeValueAsString(Map.of("email",value("work_email",id),"password",PASSWORD)),null,"application/json");}
    JsonNode login(UUID id)throws Exception{var r=rawLogin(id);assertEquals(201,r.statusCode(),r.body());return json.readTree(r.body());}
    HttpResponse<String> refresh(String refresh)throws Exception{
        var request=HttpRequest.newBuilder(uri("/api/v1/staff-auth/refresh")).header("Cookie","pms_staff_refresh="+refresh).POST(HttpRequest.BodyPublishers.noBody()).build();
        return client.send(request,HttpResponse.BodyHandlers.ofString());
    }
    URI uri(String path){return URI.create("http://127.0.0.1:"+env.getRequiredProperty("local.server.port")+path);}
    HttpResponse<String> send(String method,String path,String body,String token,String type)throws Exception{
        var r=HttpRequest.newBuilder(uri(path)).timeout(Duration.ofSeconds(20)).method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body));
        if(token!=null)r.header("Authorization","Bearer "+token);if(type!=null)r.header("Content-Type",type);
        return client.send(r.build(),HttpResponse.BodyHandlers.ofString());
    }
}
