package com.pms.hotelboutique.backend.modules.securityauth.application;

import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.*;
import com.pms.hotelboutique.backend.modules.securityauth.domain.AuthAuditEvent;
import jakarta.validation.Validation;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCrypt;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadModels.*;

class StaffAdminCreateServiceTests {
    final StaffAuthService sessions=mock(StaffAuthService.class);
    final StaffAuthorizationService authorization=mock(StaffAuthorizationService.class);
    final StaffAdminReadRepository reads=mock(StaffAdminReadRepository.class);
    final StaffAdminMutationRepository writes=mock(StaffAdminMutationRepository.class);
    final StaffSecurityLocks locks=mock(StaffSecurityLocks.class);
    final AuthAuditEventRepository audit=mock(AuthAuditEventRepository.class);
    final UUID actor=UUID.randomUUID(), org=UUID.randomUUID(), property=UUID.randomUUID();
    final jakarta.validation.ValidatorFactory factory=Validation.buildDefaultValidatorFactory();
    final StaffAdminMutationParser parser=new StaffAdminMutationParser(factory.getValidator());
    final StaffAdminMutationService service=new StaffAdminMutationService(sessions,authorization,new PropertyScopeResolver(),reads,writes,locks,parser,audit);
    @BeforeEach void setup(){
        var principal=new StaffPrincipal(actor,UUID.randomUUID(),"admin","GERENCIA");
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,List.of()));
        when(sessions.getActivePrincipal(principal)).thenReturn(principal);
        when(authorization.resolve(actor)).thenReturn(new StaffAuthorizationSnapshot(org,"GERENCIA",Set.of("STAFF_MANAGE"),List.of(new StaffAuthorizationSnapshot.PropertyAccess(property,"P","Hotel","America/Guatemala","GTQ"))));
        when(writes.activeRole("RECEPCION")).thenReturn(true);
        when(writes.validProperties(Set.of(property),org,Set.of(property))).thenReturn(true);
        when(reads.users(any(),any(),any(),any(),isNull())).thenAnswer(inv->{var id=(UUID)inv.getArgument(3);return List.of(new User(id,"newuser","new@hotel.test",UserStatus.SUSPENDED,RoleCode.RECEPCION,MembershipStatus.ACTIVE,org,List.of(property),Instant.now(),Instant.now(),0));});
    }
    @AfterEach void cleanup(){SecurityContextHolder.clearContext();factory.close();}
    byte[] body(String role){return ("{\"username\":\"newuser\",\"workEmail\":\" New@Hotel.test \",\"roleCode\":\""+role+"\",\"propertyIds\":[\""+property+"\"]}").getBytes(StandardCharsets.UTF_8);}
    Map<String,List<String>> query(){return Map.of("scope",List.of("PROPERTY"),"propertyId",List.of(property.toString()));}
    @Test void createsSuspendedIdentityWithAuthorizedMembershipAndAudit(){
        var user=service.create(query(),body("RECEPCION"));
        assertEquals(UserStatus.SUSPENDED,user.status());assertEquals(0,user.version());
        verify(writes).create(eq(user.id()),eq(org),eq("newuser"),eq("new@hotel.test"),eq("RECEPCION"),argThat(hash->hash.startsWith("$2")&&!BCrypt.checkpw("password",hash)),eq(Set.of(property)));
        verify(audit).save(any(AuthAuditEvent.class));verify(audit).flush();
        verify(locks).users(List.of(actor));verify(locks).properties(Set.of(property),org);
    }
    @Test void refusesPromotionAndUnauthorizedPropertiesBeforeWriting(){
        assertThrows(StaffAdminMutationException.class,()->service.create(query(),body("SUPER_ADMIN")));
        when(writes.validProperties(any(),any(),any())).thenReturn(false);
        assertThrows(StaffAdminMutationException.class,()->service.create(query(),body("RECEPCION")));
        verify(writes,never()).create(any(),any(),any(),any(),any(),any(),any());verify(audit,never()).save(any());
    }
    @Test void rejectsUnknownDuplicateAndInvalidCreationFields(){
        for(String text:List.of(new String(body("RECEPCION"),StandardCharsets.UTF_8).replace("newuser",""),new String(body("RECEPCION"),StandardCharsets.UTF_8).replace("\"username\":","\"password\":"),"{\"username\":\"one\",\"username\":\"two\",\"workEmail\":\"a@b.co\",\"roleCode\":\"RECEPCION\",\"propertyIds\":[]}"))
            assertThrows(StaffAdminMutationException.class,()->parser.parseCreate(text.getBytes(StandardCharsets.UTF_8)));
    }
}
