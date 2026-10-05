package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.util.List;
import java.util.UUID;

/** Authorized internal Staff entry for existing folio reads and postings. */
public interface StaffFolioService {
    FolioView get(StaffPrincipal principal, UUID propertyId, UUID folioId);

    MonetaryAmount balanceOf(StaffPrincipal principal, UUID propertyId, UUID folioId);

    List<FolioView.MovementView> movementsOf(StaffPrincipal principal, UUID propertyId, UUID folioId);

    FolioView.MovementView postCharge(StaffPrincipal principal, UUID propertyId, UUID folioId,
            FolioService.MovementAmount amount);

    FolioView.MovementView postPayment(StaffPrincipal principal, UUID propertyId, UUID folioId,
            FolioService.MovementAmount amount);

    FolioView.MovementView postReversal(StaffPrincipal principal, UUID propertyId, UUID folioId,
            UUID originalMovementId, FolioService.ReversalReason reason);
}
