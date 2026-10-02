package com.pms.hotelboutique.backend.modules.inventory.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PatchRoomRequest(@NotBlank @Size(max = 64) String code) {
    @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unknown field"); }
}
