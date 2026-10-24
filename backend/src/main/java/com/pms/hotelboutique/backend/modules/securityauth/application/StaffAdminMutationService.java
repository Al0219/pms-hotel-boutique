package com.pms.hotelboutique.backend.modules.securityauth.application;

import com.pms.hotelboutique.backend.modules.securityauth.domain.AuthAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.*;
import java.time.Instant;
import org.springframework.security.crypto.bcrypt.BCrypt;
import java.util.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationException.Failure.*;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationModels.*;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadModels.*;

@Service
public class StaffAdminMutationService {
    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final StaffAdminReadRepository reads;
    private final StaffAdminMutationRepository writes;
    private final StaffSecurityLocks locks;
    private final StaffAdminMutationParser parser;
    private final AuthAuditEventRepository audit;
    public StaffAdminMutationService(StaffAuthService sessions,StaffAuthorizationService authorization,PropertyScopeResolver scopes,
            StaffAdminReadRepository reads,StaffAdminMutationRepository writes,StaffSecurityLocks locks,StaffAdminMutationParser parser,AuthAuditEventRepository audit){
        this.sessions=sessions;this.authorization=authorization;this.scopes=scopes;this.reads=reads;this.writes=writes;this.locks=locks;this.parser=parser;this.audit=audit;
    }
    private record Actor(StaffPrincipal principal,StaffAuthorizationSnapshot snapshot){}
    private Actor actor(){
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication==null||!authentication.isAuthenticated()||!(authentication.getPrincipal() instanceof StaffPrincipal p))fail(STAFF_SESSION_REQUIRED);
        var principal=sessions.getActivePrincipal((StaffPrincipal)authentication.getPrincipal());
        var snapshot=authorization.resolve(principal.staffUserId());
        if(!snapshot.hasPermission("STAFF_MANAGE"))fail(STAFF_ACCESS_DENIED);
        return new Actor(principal,snapshot);
    }
    public void checkAccess(){actor();}
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public User create(Map<String,List<String>> parameters,byte[] body){
        var actor=actor();var query=StaffAdminReadQuery.parse(parameters,true);var input=parser.parseCreate(body);
        locks.users(List.of(actor.principal().staffUserId()));actor=actor();
        locks.memberships(List.of(actor.principal().staffUserId()),actor.snapshot().organizationId());
        var proposed=new HashSet<>(input.propertyIds());
        if(!portfolio(actor).containsAll(proposed))fail(STAFF_ACCESS_DENIED);
        locks.properties(proposed,actor.snapshot().organizationId());actor=actor();
        try {
            if(query.scope()==ScopeKind.PROPERTY)scopes.resolveProperty(actor.snapshot(),query.propertyId());
            else if(!("SUPER_ADMIN".equals(actor.snapshot().roleCode())&&actor.snapshot().properties().isEmpty()))scopes.resolveAllProperties(actor.snapshot());
        }catch(org.springframework.security.access.AccessDeniedException denied){fail(STAFF_ACCESS_DENIED);}
        if(!writes.validProperties(proposed,actor.snapshot().organizationId(),portfolio(actor)))fail(STAFF_ACCESS_DENIED);
        if(query.scope()==ScopeKind.PROPERTY&&!proposed.contains(query.propertyId()))fail(INVALID_REQUEST);
        if(proposed.isEmpty()&&!("SUPER_ADMIN".equals(actor.snapshot().roleCode())&&query.scope()==ScopeKind.ALL_PROPERTIES))fail(INVALID_REQUEST);
        if(!writes.activeRole(input.roleCode().name()))fail(INVALID_REQUEST);
        UUID id=UUID.randomUUID(),org=actor.snapshot().organizationId();
        // An independent, cryptographically random preimage is discarded. No password is
        // delivered or retained; SUSPENDED additionally prevents any authentication.
        byte[] entropy=new byte[32];new java.security.SecureRandom().nextBytes(entropy);
        String hash=BCrypt.hashpw(Base64.getEncoder().encodeToString(entropy),BCrypt.gensalt());
        Arrays.fill(entropy,(byte)0);
        writes.create(id,org,input.username(),input.workEmail(),input.roleCode().name(),hash,proposed);
        audit.save(AuthAuditEvent.administrative("STAFF_CREATED",id,null,org,actor.principal().staffUserId(),UUID.randomUUID(),Instant.now()));
        audit.flush();
        return visible(actor,query,id);
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Result mutate(String rawId,Map<String,List<String>> parameters,byte[] body,Kind kind){
        var actor=actor();
        var query=StaffAdminReadQuery.parse(parameters,true);
        var id=StaffAdminReadQuery.uuid(rawId);
        var command=parser.parse(body,kind);
        visible(actor,query,id); // No lock or version probing on foreign/inaccessible targets.
        var userIds=List.of(actor.principal().staffUserId(),id);
        locks.users(userIds);
        actor=actor();
        locks.memberships(userIds,actor.snapshot().organizationId());
        var target=visible(actor,query,id);
        var properties=new HashSet<>(portfolio(actor));properties.addAll(target.propertyIds());properties.addAll(command.properties);properties.retainAll(portfolio(actor));
        // Only properties in O are lockable, never a global or foreign collection.
        locks.properties(properties,actor.snapshot().organizationId());
        actor=actor();target=visible(actor,query,id);
        var org=actor.snapshot().organizationId();
        if(id.equals(actor.principal().staffUserId()))fail(STAFF_ACCESS_DENIED);
        boolean superTarget=target.roleCode()==RoleCode.SUPER_ADMIN;
        if(superTarget&&kind!=Kind.CONTACT)fail(STAFF_ACCESS_DENIED);
        if(kind!=Kind.STATUS&&target.status()==UserStatus.DISABLED)fail(STAFF_STATE_CONFLICT);
        if(command.version!=target.version())fail(STAFF_VERSION_CONFLICT);
        boolean changed;
        if(kind==Kind.CONTACT)changed=!command.email.equals(target.workEmail().trim().toLowerCase(Locale.ROOT));
        else if(kind==Kind.STATUS){
            if(target.status()==UserStatus.DISABLED&&!"DISABLED".equals(command.status))fail(STAFF_STATE_CONFLICT);
            changed=!command.status.equals(target.status().name());
        } else {
            if(!writes.activeRole(command.role))fail(INVALID_REQUEST);
            if(!writes.validProperties(command.properties,org,portfolio(actor)))fail(STAFF_ACCESS_DENIED);
            if(command.properties.isEmpty()&&(target.status()!=UserStatus.SUSPENDED||!"SUPER_ADMIN".equals(actor.snapshot().roleCode())||query.scope()!=ScopeKind.ALL_PROPERTIES))fail(STAFF_STATE_CONFLICT);
            changed=!command.role.equals(target.roleCode().name())||!command.role.equals(writes.legacyRole(id,org))||!command.properties.equals(writes.assignments(id,org));
        }
        if(!changed)return new Result(org,id,target.version(),false);
        locks.sessionsAndTokens(id);
        String field=kind==Kind.CONTACT?"work_email":kind==Kind.STATUS?"status":"role_code";
        String value=kind==Kind.CONTACT?command.email:kind==Kind.STATUS?command.status:command.role;
        if(writes.updateUser(id,org,command.version,field,value)!=1)fail(STAFF_VERSION_CONFLICT);
        if(kind==Kind.MEMBERSHIP)writes.replaceMembership(id,org,command.role,command.properties);
        UUID correlation=UUID.randomUUID(); Instant now=Instant.now();
        for(UUID session:writes.revokeSessions(id))audit.save(AuthAuditEvent.administrative("STAFF_SESSION_REVOKED",id,session,org,actor.principal().staffUserId(),correlation,now));
        String action=kind==Kind.CONTACT?"STAFF_CONTACT_UPDATED":kind==Kind.MEMBERSHIP?"STAFF_MEMBERSHIP_REPLACED":"STAFF_STATUS_CHANGED";
        audit.save(AuthAuditEvent.administrative(action,id,null,org,actor.principal().staffUserId(),correlation,now));
        audit.flush(); // Any failure rolls back writes, version, revocations AND events.
        return new Result(org,id,command.version+1,true);
    }
    private Set<UUID> portfolio(Actor actor){return new HashSet<>(actor.snapshot().properties().stream().map(StaffAuthorizationSnapshot.PropertyAccess::propertyId).toList());}
    private User visible(Actor actor,StaffAdminReadQuery query,UUID id){
        Scope scope;
        try{
            if(query.scope()==ScopeKind.ALL_PROPERTIES&&"SUPER_ADMIN".equals(actor.snapshot().roleCode())&&actor.snapshot().properties().isEmpty())scope=new Scope(ScopeKind.ALL_PROPERTIES,List.of());
            else {var resolved=query.scope()==ScopeKind.PROPERTY?scopes.resolveProperty(actor.snapshot(),query.propertyId()):scopes.resolveAllProperties(actor.snapshot());scope=new Scope(query.scope(),List.copyOf(resolved.propertyIds()));}
        }catch(org.springframework.security.access.AccessDeniedException denied){throw new StaffAdminMutationException(STAFF_ACCESS_DENIED);}
        var targets=reads.users(actor.snapshot(),scope,query,id,null);
        if(targets.isEmpty())fail(STAFF_USER_NOT_FOUND);
        return targets.getFirst();
    }
    private static void fail(StaffAdminMutationException.Failure failure){throw new StaffAdminMutationException(failure);}
}
