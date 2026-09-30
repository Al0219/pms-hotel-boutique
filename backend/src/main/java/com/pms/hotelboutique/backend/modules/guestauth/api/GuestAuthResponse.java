package com.pms.hotelboutique.backend.modules.guestauth.api;
public record GuestAuthResponse(String accessToken,String refreshToken,long accessTokenExpiresInSeconds) { }
