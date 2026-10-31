package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.oidc;
public interface GoogleOidcClient {
    default VerifiedGoogleIdentity exchange(String code, String pkceVerifier, String expectedNonce) {
        return exchange(code, pkceVerifier, expectedNonce, null);
    }
    VerifiedGoogleIdentity exchange(String code, String pkceVerifier, String expectedNonce, String redirectUriOverride);
}
