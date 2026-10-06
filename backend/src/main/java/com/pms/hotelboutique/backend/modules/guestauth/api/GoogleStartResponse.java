package com.pms.hotelboutique.backend.modules.guestauth.api;

import io.swagger.v3.oas.annotations.media.Schema;
public record GoogleStartResponse(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, format = "uri", description = "URL Google con state/nonce/PKCE generados por Backend; no incluir valores reales en ejemplos.") String authorizationUrl) { }
