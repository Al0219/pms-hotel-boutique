package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.PropertyRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType;
import com.pms.hotelboutique.backend.modules.securityauth.application.PropertyScopeResolver;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Currency;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional
public class PropertyService {
    private final PropertyRepository properties;
    private final PropertyAccess access;
    private final PropertyScopeResolver scopes;
    private final AuditService audit;
    private final ObjectMapper json;

    public PropertyService(PropertyRepository properties, PropertyAccess access, PropertyScopeResolver scopes,
            AuditService audit, ObjectMapper json) {
        this.properties = properties;
        this.access = access;
        this.scopes = scopes;
        this.audit = audit;
        this.json = json;
    }

    @PreAuthorize("@propertyAccess.canCreate(authentication)")
    public PropertyView create(String code, String name, String timezone, String currency) {
        var context = access.current();
        if (!"SUPER_ADMIN".equals(context.snapshot().roleCode()) || !context.snapshot().hasPermission("STAFF_MANAGE")) {
            throw new AccessDeniedException("Property creation requires SUPER_ADMIN and STAFF_MANAGE");
        }
        // ZoneId also accepts offsets; this contract only accepts registered zone IDs.
        if (!ZoneId.getAvailableZoneIds().contains(timezone)) {
            throw new IllegalArgumentException("Registered timezone required");
        }
        var property = new Property(UUID.randomUUID(), context.snapshot().organizationId(), code, name,
                timezone, Currency.getInstance(currency), Property.Status.ACTIVE, now());
        properties.saveAndFlush(property);
        var result = PropertyView.from(property);
        record(context, "PROPERTY_CREATED", result, null);
        return result;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@propertyAccess.canList(authentication)")
    public List<PropertyView> list() {
        var context = access.current();
        requirePermission(context, "MULTI_PROPERTY_READ");
        var scope = scopes.resolveAllProperties(context.snapshot());
        return properties.findActiveInScope(scope).stream().map(PropertyView::from).toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@propertyAccess.isStaff(authentication)")
    public PropertyView get(UUID propertyId) {
        var scope = scopes.resolveProperty(access.current().snapshot(), propertyId);
        return PropertyView.from(properties.findByIdInScope(scope, propertyId)
                .orElseThrow(PropertyNotFoundException::new));
    }

    @PreAuthorize("@propertyAccess.canUpdate(authentication)")
    public PropertyView update(UUID propertyId, String code, String name) {
        var context = access.current();
        requirePermission(context, "COMMERCIAL_MANAGE");
        var scope = scopes.resolveProperty(context.snapshot(), propertyId);
        var property = properties.lockByIdInScope(scope, propertyId).orElseThrow(PropertyNotFoundException::new);
        if (code == null && name == null) { throw new IllegalArgumentException("At least one field is required"); }
        var before = PropertyView.from(property);
        if (property.rename(code == null ? property.getCode() : code,
                name == null ? property.getName() : name, now())) {
            properties.flush();
            record(context, "PROPERTY_UPDATED", PropertyView.from(property), before);
        }
        return PropertyView.from(property);
    }

    private void record(PropertyAccess.Context context, String action, PropertyView after, PropertyView before) {
        audit.record(new AuditService.RecordAuditCommand(ActorType.STAFF, context.principal().staffUserId(),
                action, "PROPERTY", after.id(), after.id(), before == null ? null : json.writeValueAsString(before),
                json.writeValueAsString(after), null, UUID.randomUUID()));
    }

    private void requirePermission(PropertyAccess.Context context, String permission) {
        if (!context.snapshot().hasPermission(permission)) {
            throw new AccessDeniedException("Insufficient property permission");
        }
    }

    // PostgreSQL timestamptz persists microseconds; responses and audit use that same precision.
    private Instant now() { return Instant.now().truncatedTo(ChronoUnit.MICROS); }
}
