package com.pms.hotelboutique.backend.modules.guestauth.api;

import io.swagger.v3.oas.annotations.media.Schema;
public record GuestAuthResponse(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "JWT Guest sensible, BFF Web o Android nativo seguro, nunca browser JS; sin ejemplos.") String accessToken,@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Refresh opaco Guest sensible, BFF Web o Android nativo seguro, nunca browser JS; sin ejemplos.") String refreshToken,@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "TTL restante del access token en segundos.") long accessTokenExpiresInSeconds) { }
