package com.pms.hotelboutique.backend.modules.securityauth.api;

public record StaffAuthResponse(String accessToken, String refreshToken, long accessTokenExpiresInSeconds) { }
