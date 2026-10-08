package com.pms.hotelboutique.backend.modules.inventory.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
@Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE, description = "Editar solo campos presentes; al menos uno. Omisión conserva valor; null explícito y campos desconocidos rechazados.")
public record PatchRoomRequest(@NotBlank @Size(max = 64) String code) {
    @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unknown field"); }
}
