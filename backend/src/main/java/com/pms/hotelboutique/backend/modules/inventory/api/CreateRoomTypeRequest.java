package com.pms.hotelboutique.backend.modules.inventory.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
@Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE, description = "JSON de catálogo; campos desconocidos rechazados.")
public record CreateRoomTypeRequest(@NotBlank @Size(max = 64) String code, @NotBlank @Size(max = 160) String name) {
    @JsonAnySetter
    public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unknown field"); }
}
