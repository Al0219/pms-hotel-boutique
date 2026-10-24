package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.util.Currency;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** New simulated bookings only. The enclosing immutable booking receipt deduplicates all effects. */
@Service
public class SimulatedBookingFolioService {
    private final FolioService folios;

    public SimulatedBookingFolioService(FolioService folios) { this.folios = folios; }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID propertyId, UUID reservationId, long totalMinor, String currency, PaymentResult payment) {
        if (totalMinor <= 0 || payment == null || !payment.isApproved())
            throw new IllegalArgumentException("an approved simulation and positive total are required");
        var amount = new MonetaryAmount(new MinorUnits(totalMinor), Currency.getInstance(currency));
        var folio = folios.openFolio(new FolioService.OpenFolioCommand(propertyId, Folio.Type.GUEST,
                currency, reservationId, null, "Reserva pública — pago simulado"));
        folios.postCharge(folio.id(), new FolioService.MovementAmount(amount, "Alojamiento de reserva pública"), null);
        folios.postPayment(folio.id(), new FolioService.MovementAmount(amount,
                "Pago simulado — " + payment.reference()), null);
    }
}
