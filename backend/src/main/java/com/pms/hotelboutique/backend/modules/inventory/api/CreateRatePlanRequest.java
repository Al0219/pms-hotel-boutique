package com.pms.hotelboutique.backend.modules.inventory.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateRatePlanRequest(@NotNull UUID roomTypeId, @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 160) String name, @NotNull @Valid CatalogPriceRequest basePrice) {
    @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unknown field"); }
}
