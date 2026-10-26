package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.util.UUID;

/** Server-only; the account and immutable proof must already be verified in this transaction. */
public interface VerifiedEmailHistoryPort {
    void linkConfirmedCompatibleReservations(UUID accountId, UUID verificationId);
    void linkCompatibleReservations(UUID accountId, UUID verificationId);
}
