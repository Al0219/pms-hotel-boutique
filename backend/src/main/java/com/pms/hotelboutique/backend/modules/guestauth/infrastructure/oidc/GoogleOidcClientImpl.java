package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.oidc;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestAuthenticationException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

@Component
public class GoogleOidcClientImpl implements GoogleOidcClient {
    private static final String ISSUER = "https://accounts.google.com";
    private final String clientId; private final String clientSecret; private final String redirectUri; private final RestClient restClient;
    public GoogleOidcClientImpl(@Value("${pms.google.client-id:}") String clientId, @Value("${pms.google.client-secret:}") String clientSecret,
            @Value("${pms.google.redirect-uri:}") String redirectUri) {
        this.clientId=clientId; this.clientSecret=clientSecret; this.redirectUri=redirectUri; this.restClient=RestClient.create();
    }
    @Override public VerifiedGoogleIdentity exchange(String code,String verifier,String expectedNonce) {
        return exchange(code, verifier, expectedNonce, null);
    }
    @Override public VerifiedGoogleIdentity exchange(String code,String verifier,String expectedNonce,String redirectUriOverride) {
        String effectiveRedirectUri = (redirectUriOverride != null && !redirectUriOverride.isBlank() && !redirectUriOverride.contains("localhost") && !redirectUriOverride.contains("127.0.0.1") && !redirectUriOverride.contains("backend:"))
            ? redirectUriOverride
            : this.redirectUri;
        if (effectiveRedirectUri == null || effectiveRedirectUri.isBlank() || effectiveRedirectUri.contains("localhost") || effectiveRedirectUri.contains("127.0.0.1")) {
            effectiveRedirectUri = "http://162.35.114.4/api/auth/guest/google/callback";
        }
        if (blank(clientId)||blank(clientSecret)||blank(effectiveRedirectUri)) throw new IllegalStateException("Google OIDC deployment configuration is required");
        var form=new LinkedMultiValueMap<String,String>(); form.add("code",code); form.add("client_id",clientId); form.add("client_secret",clientSecret); form.add("redirect_uri",effectiveRedirectUri); form.add("grant_type","authorization_code"); form.add("code_verifier",verifier);
        GoogleTokenResponse token;
        try { token=restClient.post().uri("https://oauth2.googleapis.com/token").contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(GoogleTokenResponse.class); }
        catch (RuntimeException ex) { throw new GuestAuthenticationException(); }
        if(token==null||blank(token.idToken())) throw new GuestAuthenticationException();
        try {
            JwtDecoder decoder=JwtDecoders.fromIssuerLocation(ISSUER); Jwt jwt=decoder.decode(token.idToken());
            List<String> audience=jwt.getAudience(); Boolean verified=jwt.getClaim("email_verified"); String nonce=jwt.getClaimAsString("nonce"); String email=jwt.getClaimAsString("email");
            if(!audience.contains(clientId)||!Boolean.TRUE.equals(verified)||!expectedNonce.equals(nonce)||blank(jwt.getSubject())||blank(email)) throw new GuestAuthenticationException();
            return new VerifiedGoogleIdentity(jwt.getSubject(),email.trim().toLowerCase(java.util.Locale.ROOT));
        } catch(RuntimeException ex) { if(ex instanceof GuestAuthenticationException auth) throw auth; throw new GuestAuthenticationException(); }
    }
    private boolean blank(String value){return value==null||value.isBlank();}
    private record GoogleTokenResponse(@com.fasterxml.jackson.annotation.JsonProperty("id_token") String idToken) { }
}
