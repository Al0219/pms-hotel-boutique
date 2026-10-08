package com.pms.hotelboutique.backend.modules.inventory.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
@Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE, description = "JSON de catálogo; campos desconocidos rechazados.")
public record CreateRoomRequest(@NotNull UUID roomTypeId, @NotBlank @Size(max = 64) String code) {
    @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unknown field"); }
}
