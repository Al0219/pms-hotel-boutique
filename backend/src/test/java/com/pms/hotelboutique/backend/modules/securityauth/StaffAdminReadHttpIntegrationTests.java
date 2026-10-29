package com.pms.hotelboutique.backend.modules.securityauth;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffAdminReadRepository;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import tools.jackson.databind.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.ArgumentMatchers.*;

/** Real HTTP, C1 sessions, C2 memberships and PostgreSQL. No mocked authentication or global fixtures. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StaffAdminReadHttpIntegrationTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired ObjectMapper json;
    @Autowired Environment environment;
    @MockitoSpyBean StaffAdminReadRepository repository;
    UUID org, foreignOrg, p1, p2, p3, foreignProperty, inactiveProperty;
    UUID admin, manager, a, b, c, empty, inactiveMembership, inactivePartial, inactiveAssigned, special, foreign, orphan;
    String prefix, adminToken, managerToken;
    final Map<UUID, StaffPrincipal> principals = new HashMap<>();
    HttpClient client;

    @BeforeEach void fixtures() {
        client = HttpClient.newHttpClient();
        prefix = "read-" + UUID.randomUUID() + "-";
        org = organization(); foreignOrg = organization();
        p1 = property(org, "ACTIVE"); p2 = property(org, "ACTIVE"); p3 = property(org, "ACTIVE");
        inactiveProperty = property(org, "INACTIVE"); foreignProperty = property(foreignOrg, "ACTIVE");
        admin = staff(org, "SUPER_ADMIN", "ACTIVE", "ACTIVE", "admin");
        manager = staff(org, "GERENCIA", "ACTIVE", "ACTIVE", "manager", p1,p2);
        adminToken = token(admin); managerToken = token(manager);
        a = staff(org, "RECEPCION", "ACTIVE", "ACTIVE", "target-A", p1);
        b = staff(org, "RECEPCION", "SUSPENDED", "ACTIVE", "target-B", p1,p2);
        c = staff(org, "OPERACIONES", "DISABLED", "ACTIVE", "target-C", p1,p3);
        empty = staff(org, "AUDITOR", "ACTIVE", "ACTIVE", "target-D");
        inactiveMembership = staff(org, "RECEPCION", "ACTIVE", "INACTIVE", "target-E", p1,p2);
        inactivePartial = staff(org, "RECEPCION", "SUSPENDED", "INACTIVE", "target-F", p1,p3);
        inactiveAssigned = staff(org, "AUDITOR", "ACTIVE", "ACTIVE", "target-G", inactiveProperty);
        special = staff(org, "RECEPCION", "ACTIVE", "ACTIVE", "target%_!\\needle", p1);
        foreign = staff(foreignOrg, "RECEPCION", "ACTIVE", "ACTIVE", "foreign", foreignProperty);
        orphan = staff(null, "RECEPCION", "ACTIVE", "ACTIVE", "orphan");
        // Deliberately divergent legacy mirror: membership remains authority.
        jdbc.update("UPDATE staff_users SET role_code='AUDITOR' WHERE id=?", inactiveMembership);
    }
    @AfterEach void closeClient() { client.close(); }

    @Test void rolesAreFiveFixedAndResponsesNeverExposeSecrets() throws Exception {
        for (String token : List.of(adminToken, managerToken)) {
            var response = get("/roles", "", token); assertResponse(response, 200);
            var body = json.readTree(response.body());
            assertEquals(org.toString(), body.path("organizationId").asText());
            assertEquals(List.of("SUPER_ADMIN","GERENCIA","RECEPCION","OPERACIONES","AUDITOR"),
                    values(body.path("items"), "code"));
            for (var role : body.path("items")) assertEquals(Set.of("code", "name"), keys(role));
        }
        var response = get("/users/"+a, "scope=PROPERTY&propertyId="+p1, adminToken);
        assertResponse(response, 200);
        var item = json.readTree(response.body()).path("item");
        assertEquals(Set.of("id","username","workEmail","status","roleCode","membershipStatus","organizationId","propertyIds","createdAt","updatedAt","version"), keys(item));
        assertFalse(response.body().contains("password")); assertFalse(response.body().contains("token"));
        assertFalse(response.body().contains("sessionId"));
    }
    @Test void propertyChecksCompleteAssignmentsAgainstActorPortfolioInSql() throws Exception {
        var body = list(managerToken, "scope=PROPERTY&propertyId="+p1);
        assertEquals(Set.of(a,b,inactiveMembership,special), ids(body));
        assertEquals(Set.of(p1.toString(),p2.toString()), new HashSet<>(values(find(body, b).path("propertyIds"), null)));
        assertEquals("SUSPENDED", find(body,b).path("status").asText());
        assertEquals("INACTIVE", find(body,inactiveMembership).path("membershipStatus").asText());
        assertEquals("RECEPCION", find(body,inactiveMembership).path("roleCode").asText());
        assertEquals(Set.of(a,b,inactiveMembership,special), ids(list(managerToken,"scope=ALL_PROPERTIES")));
        assertResponse(get("/users/"+b,"scope=PROPERTY&propertyId="+p2,managerToken),200);
        assertResponse(get("/users/"+a,"scope=PROPERTY&propertyId="+p2,managerToken),404);
        assertResponse(get("/users/"+c,"scope=ALL_PROPERTIES",adminToken),200);
        assertEquals("DISABLED", json.readTree(get("/users/"+c,"scope=ALL_PROPERTIES",adminToken).body()).path("item").path("status").asText());
    }
    @Test void foreignPartialUnassignedAndSuperAdminTargetsAreIndistinguishableFromMissing() throws Exception {
        String missing = get("/users/"+UUID.randomUUID(),"scope=ALL_PROPERTIES",managerToken).body();
        for (UUID id : List.of(c,inactivePartial,empty,inactiveAssigned,admin,foreign,orphan)) {
            var response=get("/users/"+id,"scope=ALL_PROPERTIES",managerToken);
            assertResponse(response,404); assertEquals(missing,response.body());
        }
        assertResponse(get("/users/"+foreign,"scope=ALL_PROPERTIES",adminToken),404);
        assertResponse(get("/users/"+orphan,"scope=ALL_PROPERTIES",adminToken),404);
        assertResponse(get("/users/"+empty,"scope=ALL_PROPERTIES",adminToken),200);
        assertResponse(get("/users/"+inactiveAssigned,"scope=ALL_PROPERTIES",adminToken),200);
        assertResponse(get("/users/"+empty,"scope=PROPERTY&propertyId="+p1,adminToken),404);
        assertResponse(get("/users/"+admin,"scope=PROPERTY&propertyId="+p1,adminToken),200);
        assertResponse(get("/users/"+foreign,"scope=PROPERTY&propertyId="+foreignProperty,adminToken),403);
    }
    @Test void superAdminWithEmptyOrganizationCanReadExplicitAllWithoutChangingSharedScope() throws Exception {
        UUID noPropertiesOrg=organization();
        UUID owner=staff(noPropertiesOrg,"SUPER_ADMIN","ACTIVE","ACTIVE","no-properties-admin");
        UUID target=staff(noPropertiesOrg,"RECEPCION","SUSPENDED","INACTIVE","no-properties-user");
        var response=get("/users/"+target,"scope=ALL_PROPERTIES",token(owner)); assertResponse(response,200);
        var body=json.readTree(response.body());assertTrue(body.path("scope").path("propertyIds").isEmpty());
        assertTrue(body.path("item").path("propertyIds").isEmpty());
        assertResponse(get("/users/"+target,"scope=PROPERTY&propertyId="+p1,token(owner)),403);
    }
    @Test void rejectsAllUnprivilegedRolesAndGuestExpiredRevokedAndInactiveSessions() throws Exception {
        for(String role:List.of("RECEPCION","OPERACIONES","AUDITOR")) {
            UUID actor=staff(org,role,"ACTIVE","ACTIVE","actor-"+role,p1);
            for(String resource:List.of("/roles","/users","/users/"+a))
                assertResponse(get(resource,resource.equals("/roles")?"":"scope=ALL_PROPERTIES",token(actor)),403);
        }
        String guest=guestJwt.issue(new GuestPrincipal(UUID.randomUUID(),UUID.randomUUID(),"guest@example.test"),Instant.now());
        String expired=jwt.issue(principals.get(admin),Instant.now().minus(Duration.ofDays(1)));
        for(String token:List.of("invalid",guest,expired)) assertResponse(get("/users","scope=ALL_PROPERTIES",token),401);
        assertResponse(get("/roles","",null),401);
        UUID unknown=UUID.randomUUID();
        assertResponse(get("/roles","",jwt.issue(new StaffPrincipal(unknown,UUID.randomUUID(),"unknown","SUPER_ADMIN"),Instant.now())),401);
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?",principals.get(admin).sessionId());
        assertResponse(get("/roles","",adminToken),401);
        jdbc.update("UPDATE organization_memberships SET status='INACTIVE' WHERE staff_user_id=?",manager);
        assertResponse(get("/roles","",managerToken),401);
        UUID suspended=staff(org,"GERENCIA","SUSPENDED","ACTIVE","suspended-actor",p1);
        assertResponse(get("/roles","",token(suspended)),401);
        UUID noAccess=staff(org,"GERENCIA","ACTIVE","ACTIVE","unassigned-actor");
        assertResponse(get("/roles","",token(noAccess)),401);
        UUID expiredSession=staff(org,"GERENCIA","ACTIVE","ACTIVE","expired-session-actor",p1);
        jdbc.update("UPDATE auth_sessions SET expires_at=now()-interval '1 minute' WHERE id=?",principals.get(expiredSession).sessionId());
        assertResponse(get("/roles","",token(expiredSession)),401);
    }
    @Test void filtersAreLiteralAndDefaultIncludesEveryState() throws Exception {
        assertEquals(Set.of(b,inactivePartial), ids(list(adminToken,"scope=ALL_PROPERTIES&status=SUSPENDED&roleCode=RECEPCION")));
        assertEquals(Set.of(c),ids(list(adminToken,"scope=ALL_PROPERTIES&status=DISABLED")));
        var response=get("/users","scope=ALL_PROPERTIES&username="+encode("  "+prefix.toUpperCase(Locale.ROOT)+"TARGET%_!\\needle  "),adminToken);
        assertResponse(response,200); assertEquals(Set.of(special),ids(json.readTree(response.body())));
        assertEquals(8,ids(list(adminToken,"scope=ALL_PROPERTIES")).size());
        assertResponse(get("/users","scope=PROPERTY&propertyId="+p3,managerToken),403);
        assertTrue(ids(list(adminToken,"scope=ALL_PROPERTIES&status=DISABLED&roleCode=AUDITOR")).isEmpty());
    }
    @Test void keysetHasStableOrderNoDuplicateRowsAndContextBoundCursors() throws Exception {
        String query="scope=ALL_PROPERTIES&username="+encode(prefix+"target")+"&limit=2";
        List<String> names=new ArrayList<>();Set<String> seen=new HashSet<>();String cursor=null;
        do {
            var response=get("/users",query+(cursor==null?"":"&cursor="+encode(cursor)),adminToken);assertResponse(response,200);
            var page=json.readTree(response.body());assertTrue(page.path("items").size()<=2);
            for(var item:page.path("items")){names.add(item.path("username").asText());assertTrue(seen.add(item.path("id").asText()));}
            cursor=page.path("nextCursor").isNull()?null:page.path("nextCursor").asText();
        } while(cursor!=null);
        assertEquals(8,seen.size());assertEquals(names.stream().sorted().toList(),names);
        var first=json.readTree(get("/users",query,adminToken).body());String next=first.path("nextCursor").asText();assertFalse(next.isBlank());
        for(String changed:List.of(query.replace("limit=2","limit=3"),query+"&status=ACTIVE",
                query.replace("ALL_PROPERTIES","PROPERTY")+"&propertyId="+p1,query.replace("target","target-A")))
            assertResponse(get("/users",changed+"&cursor="+encode(next),adminToken),400);
        assertResponse(get("/users",query+"&cursor="+encode(next),managerToken),400);
        assertResponse(get("/users",query+"&cursor="+encode(next+"x"),adminToken),400);
        String managerCursor=json.readTree(get("/users",query,managerToken).body()).path("nextCursor").asText();
        assertFalse(managerCursor.equals("null")||managerCursor.isEmpty());
        jdbc.update("UPDATE membership_properties SET status='INACTIVE' WHERE staff_user_id=? AND property_id=?",manager,p2);
        assertResponse(get("/users",query+"&cursor="+encode(managerCursor),managerToken),400);
    }
    @Test void authorizationAndProjectionUseOneSnapshotAcrossConcurrentAssignmentChange() throws Exception {
        var entered = new CountDownLatch(1); var proceed = new CountDownLatch(1);
        doAnswer(invocation -> {
            entered.countDown();
            if (!proceed.await(15,TimeUnit.SECONDS)) throw new AssertionError("Snapshot test timed out");
            return invocation.callRealMethod();
        }).when(repository).users(any(),any(),any(),nullable(UUID.class),nullable(StaffAdminCursorCodec.Position.class));
        try (var executor = Executors.newSingleThreadExecutor()) {
            var pending=executor.submit(() -> get("/users/"+a,"scope=PROPERTY&propertyId="+p1,managerToken));
            try {
                assertTrue(entered.await(15,TimeUnit.SECONDS));
                jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",a,org,p3);
            } finally { proceed.countDown(); }
            var response=pending.get(15,TimeUnit.SECONDS);assertResponse(response,200);
            assertEquals(List.of(p1.toString()),values(json.readTree(response.body()).path("item").path("propertyIds"),null));
            assertResponse(get("/users/"+a,"scope=PROPERTY&propertyId="+p1,managerToken),404);
        }
    }
    @Test void strictParametersRejectDuplicatesUnknownAndMissingScope() throws Exception {
        for(String query:List.of("","scope=PROPERTY","scope=ALL_PROPERTIES&propertyId="+p1,"scope=ALL_PROPERTIES&scope=PROPERTY",
                "scope=ALL_PROPERTIES&organizationId="+foreignOrg,"scope=ALL_PROPERTIES&status=invalid","scope=ALL_PROPERTIES&limit=101",
                "scope=ALL_PROPERTIES&sort=id","scope=ALL_PROPERTIES&username=%20","scope=ALL_PROPERTIES&cursor=bad"))
            assertResponse(get("/users",query,adminToken),400);
        assertResponse(get("/roles","scope=ALL_PROPERTIES",adminToken),400);
        assertResponse(get("/users/not-a-uuid","scope=ALL_PROPERTIES",adminToken),400);
        assertResponse(get("/users/"+a,"scope=ALL_PROPERTIES&limit=1",adminToken),400);
        // Permission takes precedence over parsing bad filters.
        UUID reception=staff(org,"RECEPCION","ACTIVE","ACTIVE","invalid-query-actor",p1);
        assertResponse(get("/users","notAllowed=yes",token(reception)),403);
    }
    @Test void pagesAboveOneHundredAreLimitedOnServerAndInactiveAssignmentsAreNotReturned() throws Exception {
        for(int i=0;i<105;i++)staff(org,"RECEPCION","ACTIVE","ACTIVE",String.format(Locale.ROOT,"large-%03d",i),p1,p2);
        String query="scope=PROPERTY&propertyId="+p1+"&username="+encode(prefix+"large-")+"&limit=100";
        var first=get("/users",query,managerToken);assertResponse(first,200);
        var body=json.readTree(first.body());assertEquals(100,body.path("items").size());
        String next=body.path("nextCursor").asText();assertFalse(next.isBlank());
        var second=get("/users",query+"&cursor="+encode(next),managerToken);assertResponse(second,200);
        var end=json.readTree(second.body());assertEquals(5,end.path("items").size());assertTrue(end.path("nextCursor").isNull());
        Set<UUID> seen=ids(body);assertTrue(Collections.disjoint(seen,ids(end)));
        jdbc.update("UPDATE membership_properties SET status='INACTIVE' WHERE staff_user_id=? AND property_id=?",b,p2);
        var detail=get("/users/"+b,"scope=PROPERTY&propertyId="+p1,managerToken);assertResponse(detail,200);
        assertEquals(List.of(p1.toString()),values(json.readTree(detail.body()).path("item").path("propertyIds"),null));
    }
    @Test void unsupportedAdministrativeMethodsHaveNoSideEffectsAndReturn405() throws Exception {
        long before=jdbc.queryForObject("SELECT count(*) FROM staff_users",Long.class);
        for(String method:List.of("PATCH","PUT","DELETE")) {
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+environment.getRequiredProperty("local.server.port")+"/api/v1/staff-admin/users"))
                    .header("Authorization","Bearer "+adminToken).header("Content-Type","application/json")
                    .method(method,HttpRequest.BodyPublishers.ofString("{}"));
            var response=client.send(request.build(),HttpResponse.BodyHandlers.ofString());
            assertEquals(405,response.statusCode(),response.body());
            assertEquals("private, no-store",response.headers().firstValue("cache-control").orElse(""));
        }
        assertEquals(before,jdbc.queryForObject("SELECT count(*) FROM staff_users",Long.class));
    }

    UUID organization(){UUID id=UUID.randomUUID();jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at) VALUES (?,'Staff read QA',?,'ACTIVE',now(),now())",id,"QA-"+id);return id;}
    UUID property(UUID org,String status){UUID id=UUID.randomUUID();jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,'QA','America/Guatemala','GTQ',?,now(),now())",id,org,"QA-"+id,status);return id;}
    UUID staff(UUID org,String role,String status,String membership,String name,UUID... properties){
        UUID id=UUID.randomUUID();String username=prefix+name;
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'not-a-login-credential',?,?,now(),now())",id,username,id+"@example.test",role,status);
        if(org!=null){jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,?,?,now(),now())",id,org,role,membership);
            for(UUID property:properties)jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",id,org,property);}
        UUID session=UUID.randomUUID();jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())",session,id);
        principals.put(id,new StaffPrincipal(id,session,username,role));return id;
    }
    String token(UUID user){return jwt.issue(principals.get(user),Instant.now());}
    JsonNode list(String token,String params)throws Exception{
        var response=get("/users",params+"&username="+encode(prefix+"target"),token);assertResponse(response,200);return json.readTree(response.body());
    }
    JsonNode find(JsonNode page,UUID id){for(var item:page.path("items"))if(item.path("id").asText().equals(id.toString()))return item;throw new AssertionError("Missing fixture");}
    Set<UUID> ids(JsonNode page){Set<UUID> result=new HashSet<>();for(var item:page.path("items"))assertTrue(result.add(UUID.fromString(item.path("id").asText())));return result;}
    List<String> values(JsonNode array,String field){List<String> result=new ArrayList<>();for(var item:array)result.add(field==null?item.asText():item.path(field).asText());return result;}
    Set<String> keys(JsonNode object){Set<String> result=new HashSet<>();object.properties().forEach(p->result.add(p.getKey()));return result;}
    HttpResponse<String> get(String resource,String query,String token)throws Exception{
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+environment.getRequiredProperty("local.server.port")+"/api/v1/staff-admin"+resource+(query.isEmpty()?"":"?"+query))).GET();
        if(token!=null)request.header("Authorization","Bearer "+token);
        return client.send(request.build(),HttpResponse.BodyHandlers.ofString());
    }
    void assertResponse(HttpResponse<String> response,int status)throws Exception{
        assertEquals(status,response.statusCode(),response.body());
        assertEquals("private, no-store",response.headers().firstValue("cache-control").orElse(""));
        if(status>=400){assertTrue(response.headers().firstValue("content-type").orElse("").startsWith("application/problem+json"));
            var error=json.readTree(response.body());assertEquals(Set.of("type","title","status","code"),keys(error));assertEquals(status,error.path("status").asInt());}
    }
    String encode(String value){return URLEncoder.encode(value,StandardCharsets.UTF_8);}
}
