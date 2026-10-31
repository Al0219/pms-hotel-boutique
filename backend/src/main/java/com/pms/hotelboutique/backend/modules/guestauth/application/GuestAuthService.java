package com.pms.hotelboutique.backend.modules.guestauth.application;
public interface GuestAuthService {
 GuestTokenPair createVerifiedSession(java.util.UUID accountId);
 boolean acceptsCredentials(String email,String password);
 GuestTokenPair login(String email,String password);
 default String startGoogleAuthorization() { return startGoogleAuthorization(null); }
 String startGoogleAuthorization(String redirectUriOverride);
 default GuestTokenPair exchangeGoogleAuthorization(String code, String state) { return exchangeGoogleAuthorization(code, state, null); }
 GuestTokenPair exchangeGoogleAuthorization(String code, String state, String redirectUriOverride);
 GuestTokenPair refresh(String rawRefreshToken);
 GuestPrincipal getActivePrincipal(GuestPrincipal principal);
 void logout(GuestPrincipal principal);
}
