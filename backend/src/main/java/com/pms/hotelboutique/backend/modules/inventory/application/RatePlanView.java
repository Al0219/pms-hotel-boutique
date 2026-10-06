package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.RatePlan;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
public record RatePlanView(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "ID del plan tarifario.") UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Propiedad del recurso.") UUID propertyId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Tipo de la misma propiedad; no posee inventario físico.") UUID roomTypeId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Código del plan.") String code,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Nombre del plan.") String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Precio exacto; no se convierte a float.") Price basePrice,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Creación UTC.") Instant createdAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Última actualización UTC.") Instant updatedAt) {
    static RatePlanView from(RatePlan plan) {
        var price = plan.getBasePrice();
        return new RatePlanView(plan.getId(), plan.getPropertyId(), plan.getRoomTypeId(), plan.getCode(), plan.getName(),
                new Price(price.amount().toPlainString(), price.currency().getCurrencyCode()), plan.getCreatedAt(), plan.getUpdatedAt());
    }
    public record Price(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Decimal exacto serializado como string.") String amount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Moneda ISO 4217.") String currency) { }
}
