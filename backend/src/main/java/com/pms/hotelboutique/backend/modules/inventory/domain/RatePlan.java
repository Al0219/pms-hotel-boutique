package com.pms.hotelboutique.backend.modules.inventory.domain;

import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import com.pms.hotelboutique.backend.shared.money.persistence.CurrencyConverter;
import com.pms.hotelboutique.backend.shared.money.persistence.MinorUnitsConverter;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Currency;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "rate_plans")
public class RatePlan extends InventoryEntity {
    @Column(name = "property_id", nullable = false)
    private UUID propertyId;
    @Column(name = "room_type_id", nullable = false)
    private UUID roomTypeId;
    @Column(nullable = false, length = 64)
    private String code;
    @Column(nullable = false, length = 160)
    private String name;
    @Convert(converter = MinorUnitsConverter.class)
    @Column(name = "base_amount_minor", nullable = false)
    private MinorUnits baseAmountMinor;
    @Convert(converter = CurrencyConverter.class)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 3, columnDefinition = "char(3)")
    private Currency currency;

    protected RatePlan() { }

    public RatePlan(UUID id, UUID propertyId, UUID roomTypeId, String code,
            String name, MonetaryAmount basePrice, Instant now) {
        super(id, now);
        this.propertyId = Objects.requireNonNull(propertyId, "propertyId");
        this.roomTypeId = Objects.requireNonNull(roomTypeId, "roomTypeId");
        this.code = InventoryValues.text(code, "code", 64);
        this.name = InventoryValues.text(name, "name", 160);
        Objects.requireNonNull(basePrice, "basePrice");
        if (basePrice.minorUnits().value() < 0) {
            throw new IllegalArgumentException("Base price cannot be negative");
        }
        this.baseAmountMinor = basePrice.minorUnits();
        this.currency = basePrice.currency();
    }

    public UUID getPropertyId() { return propertyId; }
    public UUID getRoomTypeId() { return roomTypeId; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public MonetaryAmount getBasePrice() { return new MonetaryAmount(baseAmountMinor, currency); }

    public boolean revise(String code, String name, MonetaryAmount price, Instant now) {
        String nextCode = InventoryValues.text(code, "code", 64);
        String nextName = InventoryValues.text(name, "name", 160);
        Objects.requireNonNull(price, "price");
        if (price.minorUnits().value() < 0) { throw new IllegalArgumentException("Base price cannot be negative"); }
        if (this.code.equals(nextCode) && this.name.equals(nextName) && getBasePrice().equals(price)) { return false; }
        this.code = nextCode;
        this.name = nextName;
        this.baseAmountMinor = price.minorUnits();
        this.currency = price.currency();
        touch(now);
        return true;
    }
}
