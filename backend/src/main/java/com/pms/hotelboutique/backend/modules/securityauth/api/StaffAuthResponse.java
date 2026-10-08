package com.pms.hotelboutique.backend.modules.securityauth.api;

import io.swagger.v3.oas.annotations.media.Schema;
public record StaffAuthResponse(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "JWT Staff sensible, únicamente BFF; sin ejemplos.") String accessToken,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Refresh opaco Staff sensible, únicamente BFF; sin ejemplos.") String refreshToken,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "TTL restante del access token en segundos.") long accessTokenExpiresInSeconds) { }
