package com.pms.hotelboutique.backend.modules.inventory.domain;

import com.pms.hotelboutique.backend.shared.money.persistence.CurrencyConverter;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Currency;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "properties")
public class Property extends InventoryEntity {
    public enum Status { ACTIVE, INACTIVE }

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(nullable = false, length = 64)
    private String code;
    @Column(nullable = false, length = 64)
    private String timezone;
    @Convert(converter = CurrencyConverter.class)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 3, columnDefinition = "char(3)")
    private Currency currency;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status;

    protected Property() { }

    public Property(UUID id, UUID organizationId, String code, String name,
            String timezone, Currency currency, Status status, Instant now) {
        super(id, now);
        this.organizationId = Objects.requireNonNull(organizationId, "organizationId");
        this.code = InventoryValues.text(code, "code", 64);
        this.name = InventoryValues.text(name, "name", 160);
        this.timezone = InventoryValues.text(timezone, "timezone", 64);
        ZoneId.of(timezone);
        this.currency = Objects.requireNonNull(currency, "currency");
        this.status = Objects.requireNonNull(status, "status");
    }

    public UUID getOrganizationId() { return organizationId; }

    /** Descriptive changes only; immutable operational settings need their own contract. */
    public boolean rename(String code, String name, Instant now) {
        String nextCode = InventoryValues.text(code, "code", 64);
        String nextName = InventoryValues.text(name, "name", 160);
        if (this.code.equals(nextCode) && this.name.equals(nextName)) {
            return false;
        }
        this.code = nextCode;
        this.name = nextName;
        touch(now);
        return true;
    }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getTimezone() { return timezone; }
    public Currency getCurrency() { return currency; }
    public Status getStatus() { return status; }
}
