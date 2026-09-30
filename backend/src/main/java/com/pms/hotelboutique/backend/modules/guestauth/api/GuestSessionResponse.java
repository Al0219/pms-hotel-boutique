package com.pms.hotelboutique.backend.modules.guestauth.api;
import java.util.UUID;
public record GuestSessionResponse(UUID guestAccountId,UUID sessionId,String email,String context) { }
