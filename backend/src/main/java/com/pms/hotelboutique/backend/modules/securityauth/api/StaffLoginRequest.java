package com.pms.hotelboutique.backend.modules.securityauth.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record StaffLoginRequest(
        @NotBlank @Size(max = 80) String username,
        @NotBlank @Size(max = 256) @Schema(accessMode = Schema.AccessMode.WRITE_ONLY, format = "password", description = "Credencial Staff solo BFF; no ejemplos, logging ni respuesta.") String password) { }
