package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.PropertyRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.PropertyScopeResolver;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Shared C2 scope/audit boundary for the three property-scoped inventory catalogs. */
@Component
public class InventoryCatalogSupport {
    private final PropertyAccess access;
    private final PropertyScopeResolver scopes;
    private final PropertyRepository properties;
    private final AuditService audit;
    private final ObjectMapper json;

    public InventoryCatalogSupport(PropertyAccess access, PropertyScopeResolver scopes,
            PropertyRepository properties, AuditService audit, ObjectMapper json) {
        this.access = access;
        this.scopes = scopes;
        this.properties = properties;
        this.audit = audit;
        this.json = json;
    }

    public Context resolve(UUID propertyId, boolean write) {
        var active = access.current();
        if (write && !active.snapshot().hasPermission("COMMERCIAL_MANAGE")) {
            throw new AccessDeniedException("COMMERCIAL_MANAGE required");
        }
        var scope = scopes.resolveProperty(active.snapshot(), propertyId);
        var property = properties.findByIdInScope(scope, propertyId)
                .filter(p -> p.getStatus() == Property.Status.ACTIVE).orElseThrow(CatalogNotFoundException::new);
        return new Context(active.principal(), scope, property);
    }

    public void record(Context context, String entityType, UUID id, Object before, Object after) {
        audit.record(new AuditService.RecordAuditCommand(ActorType.STAFF, context.principal().staffUserId(),
                entityType + (before == null ? "_CREATED" : "_UPDATED"), entityType, id,
                context.property().getId(), before == null ? null : json.writeValueAsString(before),
                json.writeValueAsString(after), null, UUID.randomUUID()));
    }

    public Instant now() { return Instant.now().truncatedTo(ChronoUnit.MICROS); }

    public record Context(StaffPrincipal principal, AuthorizedPropertyScope scope, Property property) { }
}
