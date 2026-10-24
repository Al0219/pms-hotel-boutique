package com.pms.hotelboutique.backend.modules.securityauth.application;

import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffAdminReadRepository;
import java.util.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadException.Failure.*;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadModels.*;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class StaffAdminReadService {
    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final StaffAdminReadRepository repository;
    private final StaffAdminCursorCodec cursors;
    public StaffAdminReadService(StaffAuthService sessions, StaffAuthorizationService authorization,
            PropertyScopeResolver scopes, StaffAdminReadRepository repository, StaffAdminCursorCodec cursors) {
        this.sessions = sessions; this.authorization = authorization; this.scopes = scopes;
        this.repository = repository; this.cursors = cursors;
    }
    private record Actor(StaffPrincipal principal, StaffAuthorizationSnapshot snapshot) { }
    private Actor actor() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof StaffPrincipal principal))
            throw new StaffAdminReadException(STAFF_SESSION_REQUIRED);
        // Revalidation starts the service's repeatable-read snapshot; no OSIV/entity cache from HTTP filter.
        StaffPrincipal current = sessions.getActivePrincipal(principal);
        var snapshot = authorization.resolve(current.staffUserId());
        if (!snapshot.hasPermission("STAFF_MANAGE")) throw new StaffAdminReadException(STAFF_ACCESS_DENIED);
        return new Actor(current, snapshot);
    }
    public Roles roles(Map<String, List<String>> parameters) {
        var actor = actor();
        if (!parameters.isEmpty()) throw new StaffAdminReadException(INVALID_REQUEST);
        var roles = repository.roles();
        if (!roles.stream().map(Role::code).toList().equals(List.of(RoleCode.values()))
                || roles.stream().anyMatch(r -> r.name() == null || r.name().isBlank() || r.name().length() > 120)) unavailable();
        return new Roles(actor.snapshot().organizationId(), roles);
    }
    public Page users(Map<String, List<String>> parameters) {
        var actor = actor();
        var query = StaffAdminReadQuery.parse(parameters, false);
        var scope = scope(actor.snapshot(), query);
        String context = context(actor, scope, query);
        var after = query.cursor() == null ? null : cursors.decode(query.cursor(), context);
        var rows = repository.users(actor.snapshot(), scope, query, null, after);
        rows.forEach(user -> validate(user, actor.snapshot()));
        boolean more = rows.size() > query.limit();
        var items = List.copyOf(rows.subList(0, Math.min(rows.size(), query.limit())));
        String next = more ? cursors.encode(new StaffAdminCursorCodec.Position(items.getLast().username(), items.getLast().id()), context) : null;
        return new Page(actor.snapshot().organizationId(), scope, items, query.limit(), next);
    }
    public Detail user(String id, Map<String, List<String>> parameters) {
        var actor = actor();
        var query = StaffAdminReadQuery.parse(parameters, true);
        var target = StaffAdminReadQuery.uuid(id);
        var scope = scope(actor.snapshot(), query);
        var rows = repository.users(actor.snapshot(), scope, query, target, null);
        if (rows.isEmpty()) throw new StaffAdminReadException(STAFF_USER_NOT_FOUND);
        var user = rows.getFirst(); validate(user, actor.snapshot());
        return new Detail(actor.snapshot().organizationId(), scope, user);
    }
    private Scope scope(StaffAuthorizationSnapshot actor, StaffAdminReadQuery query) {
        try {
            // Preserve the shared nonempty AuthorizedPropertyScope invariant. Only this local
            // administrative view permits explicit organization-level ALL for an empty SUPER_ADMIN.
            if (query.scope() == ScopeKind.ALL_PROPERTIES && "SUPER_ADMIN".equals(actor.roleCode()) && actor.properties().isEmpty())
                return new Scope(ScopeKind.ALL_PROPERTIES, List.of());
            var resolved = query.scope() == ScopeKind.PROPERTY ? scopes.resolveProperty(actor, query.propertyId()) : scopes.resolveAllProperties(actor);
            return new Scope(query.scope(), sorted(resolved.propertyIds()));
        } catch (AccessDeniedException ex) { throw new StaffAdminReadException(STAFF_ACCESS_DENIED); }
    }
    private static List<UUID> sorted(Collection<UUID> ids) { return ids.stream().sorted(Comparator.comparing(UUID::toString)).toList(); }
    private String context(Actor actor, Scope scope, StaffAdminReadQuery query) {
        // Length-delimited fields avoid collisions from usernames/filter separators.
        List<String> fields = List.of(actor.principal().sessionId().toString(), actor.principal().staffUserId().toString(),
                actor.snapshot().organizationId().toString(), actor.snapshot().roleCode(),
                actor.snapshot().permissions().stream().sorted().toList().toString(),
                sorted(actor.snapshot().properties().stream().map(StaffAuthorizationSnapshot.PropertyAccess::propertyId).toList()).toString(),
                scope.kind().name(), scope.propertyIds().toString(), Objects.toString(query.status(), ""),
                Objects.toString(query.roleCode(), ""), Objects.toString(query.username(), ""), Integer.toString(query.limit()));
        StringBuilder value = new StringBuilder();
        fields.forEach(field -> value.append(field.length()).append(':').append(field));
        return value.toString();
    }
    private void validate(User user, StaffAuthorizationSnapshot actor) {
        if (!actor.organizationId().equals(user.organizationId()) || user.id() == null || user.username() == null
                || user.username().isBlank() || user.username().length() > 80 || user.workEmail() == null
                || user.workEmail().isBlank() || user.workEmail().length() > 320 || user.createdAt() == null
                || user.updatedAt() == null || user.updatedAt().isBefore(user.createdAt())
                || user.version() < 0 || user.version() > 9007199254740991L) unavailable();
    }
    private static void unavailable() { throw new StaffAdminReadException(STAFF_READ_UNAVAILABLE); }
}
