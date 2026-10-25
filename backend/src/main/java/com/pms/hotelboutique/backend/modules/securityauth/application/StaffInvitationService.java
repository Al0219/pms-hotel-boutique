package com.pms.hotelboutique.backend.modules.securityauth.application;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator;
import com.pms.hotelboutique.backend.modules.securityauth.domain.AuthAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.email.StaffInvitationMailer;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.*;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationException.Failure.*;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadModels.*;

@Service
public class StaffInvitationService {
    private final StaffAdminMutationService admin;
    private final StaffAdminMutationRepository writes;
    private final StaffInvitationRepository flows;
    private final StaffSecurityLocks locks;
    private final AuthAuditEventRepository audit;
    private final StaffInvitationMailer mail;
    private final PasswordEncoder passwords;
    private final PasswordLoginValidator inputs;
    public StaffInvitationService(StaffAdminMutationService admin,StaffAdminMutationRepository writes,StaffInvitationRepository flows,
            StaffSecurityLocks locks,AuthAuditEventRepository audit,StaffInvitationMailer mail,PasswordEncoder passwords,PasswordLoginValidator inputs){
        this.admin=admin;this.writes=writes;this.flows=flows;this.locks=locks;this.audit=audit;this.mail=mail;this.passwords=passwords;this.inputs=inputs;
    }
    public record Info(UUID organizationId,UUID staffUserId,long version,boolean invitationAllowed,boolean activationAllowed,boolean credentialPrepared) { }
    @Transactional(readOnly=true)
    public Info info(String id,Map<String,List<String>> parameters){
        var actor=admin.actor();var query=StaffAdminReadQuery.parse(parameters,true);var user=admin.visible(actor,query,StaffAdminReadQuery.uuid(id));
        boolean protectedUser=user.id().equals(actor.principal().staffUserId())||user.roleCode()==RoleCode.SUPER_ADMIN;
        boolean eligible=!protectedUser&&user.status()==UserStatus.SUSPENDED;
        boolean prepared=eligible&&flows.prepared(user.id(),user.organizationId());
        return new Info(user.organizationId(),user.id(),user.version(),eligible&&user.membershipStatus()==MembershipStatus.ACTIVE&&!prepared&&!flows.recent(user.id(),user.organizationId()),
            eligible&&writes.activationReady(user.id(),user.organizationId()),prepared);
    }
    @Transactional
    public StaffAdminMutationModels.Result invite(String id,Map<String,List<String>> parameters,long expectedVersion){
        var target=admin.lockTarget(id,parameters);var user=target.user();var actor=target.actor();
        if(user.version()!=expectedVersion)fail(STAFF_VERSION_CONFLICT);
        if(user.status()!=UserStatus.SUSPENDED||user.membershipStatus()!=MembershipStatus.ACTIVE
            ||flows.prepared(user.id(),user.organizationId())||flows.recent(user.id(),user.organizationId()))fail(STAFF_STATE_CONFLICT);
        byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);Arrays.fill(bytes,(byte)0);
        UUID flow=UUID.randomUUID(),generation=UUID.randomUUID();
        locks.sessionsAndTokens(user.id());writes.invalidateCredential(user.id(),user.organizationId(),false);
        flows.issue(flow,user.id(),user.organizationId(),generation,hash(token),user.workEmail());
        revoke(user.id(),user.organizationId(),actor.principal().staffUserId());
        audit.save(AuthAuditEvent.administrative("STAFF_INVITATION_SENT",user.id(),null,user.organizationId(),actor.principal().staffUserId(),flow,Instant.now()));
        audit.flush();
        mail.send(user.workEmail(),token);flows.sent(flow);
        return new StaffAdminMutationModels.Result(user.organizationId(),user.id(),expectedVersion+1,true);
    }
    @Transactional
    public void consume(String token,String password){
        if(token==null||!token.matches("[A-Za-z0-9_-]{43}"))fail(STAFF_INVITATION_INVALID);
        if(password==null||password.length()<8||password.length()>50||password.isBlank()||PasswordLoginValidator.exceedsPasswordByteLimit(password))fail(INVALID_REQUEST);
        var flow=flows.find(hash(token)).orElseThrow(()->new StaffAdminMutationException(STAFF_INVITATION_INVALID));
        locks.users(List.of(flow.user()));locks.memberships(List.of(flow.user()),flow.org());
        flow=flows.find(hash(token)).orElseThrow(()->new StaffAdminMutationException(STAFF_INVITATION_INVALID));
        var recipient=flows.recipient(flow.user(),flow.org());
        if(!recipient.eligible()||!flow.generation().equals(recipient.generation())||!recipient.email().equals(flow.email())||flow.sent()==null||flow.consumed()!=null||flow.revoked()!=null||!flow.expires().isAfter(Instant.now()))fail(STAFF_INVITATION_INVALID);
        try {inputs.normalizedEmail(recipient.email(),password);} catch(RuntimeException invalid){fail(INVALID_REQUEST);}
        var assignments=writes.assignments(flow.user(),flow.org());
        locks.properties(assignments,flow.org());
        if(assignments.isEmpty()||!writes.validProperties(assignments,flow.org(),assignments))fail(STAFF_INVITATION_INVALID);
        locks.sessionsAndTokens(flow.user());
        flows.consume(flow,passwords.encode(password));
        // Evidence and activation commit together; any failed invariant rolls back
        // the password, token consumption, version, revocation and audit as well.
        if(!writes.activationReady(flow.user(),flow.org()))fail(STAFF_INVITATION_INVALID);
        flows.activate(flow.user(),flow.org());
        revoke(flow.user(),flow.org(),flow.user());
        audit.save(AuthAuditEvent.administrative("STAFF_INVITATION_CONSUMED",flow.user(),null,flow.org(),flow.user(),flow.id(),Instant.now()));
        audit.save(AuthAuditEvent.administrative("STAFF_INVITATION_ACTIVATED",flow.user(),null,flow.org(),flow.user(),flow.id(),Instant.now()));
        audit.flush();
        // Password proof activates only the account of this authorized invitation; no session is issued.
    }
    private void revoke(UUID user,UUID org,UUID actor){
        UUID correlation=UUID.randomUUID();for(UUID session:writes.revokeSessions(user))audit.save(AuthAuditEvent.administrative("STAFF_SESSION_REVOKED",user,session,org,actor,correlation,Instant.now()));
    }
    public static String hash(String token){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException impossible){throw new IllegalStateException();}}
    private static void fail(StaffAdminMutationException.Failure failure){throw new StaffAdminMutationException(failure);}
}
