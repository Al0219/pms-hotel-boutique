package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email;
public interface EmailSender { void sendReservationLinkOtp(String recipientEmail, String otp); }
