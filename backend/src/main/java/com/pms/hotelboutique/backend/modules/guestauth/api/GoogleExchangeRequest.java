package com.pms.hotelboutique.backend.modules.guestauth.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
public record GoogleExchangeRequest(@NotBlank @Schema(accessMode = Schema.AccessMode.WRITE_ONLY, description = "Código OIDC de un uso; solo BFF, sin ejemplos.") String code,@NotBlank @Schema(accessMode = Schema.AccessMode.WRITE_ONLY, description = "State retornado por Google; debe corresponder a transacción Backend vigente.") String state) { }
