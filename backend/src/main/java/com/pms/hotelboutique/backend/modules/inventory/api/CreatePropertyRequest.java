package com.pms.hotelboutique.backend.modules.inventory.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
@Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE, description = "JSON de catálogo; campos desconocidos rechazados.")
public record CreatePropertyRequest(@NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 160) String name, @Schema(description = "Zona horaria IANA válida; inmutable en PATCH.") @NotBlank @Size(max = 64) String timezone,
        @Schema(description = "Moneda ISO 4217 válida; inmutable en PATCH.") @NotBlank @Size(min = 3, max = 3) String currency) {
    @JsonAnySetter
    public void rejectUnknown(String field, Object value) {
        throw new IllegalArgumentException("Unknown property field");
    }
}
