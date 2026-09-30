package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.oidc;
public interface GoogleOidcClient { VerifiedGoogleIdentity exchange(String code,String pkceVerifier,String expectedNonce); }
