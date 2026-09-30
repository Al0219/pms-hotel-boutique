package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Infrastructure adapter. It is used only when Reservations enables the OTP flow. */
@Component
public class ResendEmailSender implements EmailSender {
    private final String apiKey; private final String from; private final RestClient client = RestClient.create();
    public ResendEmailSender(@Value("${pms.resend.api-key:}") String apiKey, @Value("${pms.resend.from-email:}") String from) { this.apiKey=apiKey; this.from=from; }
    @Override public void sendReservationLinkOtp(String recipientEmail, String otp) {
        if (apiKey.isBlank() || from.isBlank()) throw new IllegalStateException("Resend deployment configuration is required");
        client.post().uri("https://api.resend.com/emails").contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + apiKey)
                .body(Map.of("from", from, "to", java.util.List.of(recipientEmail), "subject", "Código de verificación", "text", "Tu código de verificación es: " + otp)).retrieve().toBodilessEntity();
    }
}
