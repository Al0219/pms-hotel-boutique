package com.pms.hotelboutique.backend.modules.commercial.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Input for updating a {@code Promotion} rule. Benefit/code/property are immutable. */
public record UpdatePromotionCommand(
        @NotBlank @Size(max = 160) String name,
        int priority,
        boolean stackable,
        LocalDate validFrom,
        LocalDate validTo) {
}
