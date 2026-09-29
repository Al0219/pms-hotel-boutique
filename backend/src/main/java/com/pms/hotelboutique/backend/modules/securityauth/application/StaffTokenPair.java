package com.pms.hotelboutique.backend.modules.securityauth.application;

public record StaffTokenPair(String accessToken, String refreshToken, long accessTokenExpiresInSeconds) { }
