package com.pms.hotelboutique.backend.modules.guestauth.application;
public record GuestTokenPair(String accessToken,String refreshToken,long accessTokenExpiresInSeconds) { }
