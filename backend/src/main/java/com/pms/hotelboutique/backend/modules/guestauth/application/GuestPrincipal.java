package com.pms.hotelboutique.backend.modules.guestauth.application;
import java.util.UUID;
public record GuestPrincipal(UUID guestAccountId, UUID sessionId, String email) { }
