package com.pms.hotelboutique.backend.modules.guestauth.application;
public interface GuestAuthService {
 String startGoogleAuthorization();
 GuestTokenPair exchangeGoogleAuthorization(String code,String state);
 GuestTokenPair refresh(String rawRefreshToken);
 GuestPrincipal getActivePrincipal(GuestPrincipal principal);
 void logout(GuestPrincipal principal);
}
