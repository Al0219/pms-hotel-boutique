package com.pms.hotelboutique.backend.modules.inventory.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePropertyRequest(@NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 160) String name, @NotBlank @Size(max = 64) String timezone,
        @NotBlank @Size(min = 3, max = 3) String currency) {
    @JsonAnySetter
    public void rejectUnknown(String field, Object value) {
        throw new IllegalArgumentException("Unknown property field");
    }
}
