package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class GuestReservationHistoryService {
    private final GuestAuthService auth;
    private final GuestReservationHistoryPort history;

    public GuestReservationHistoryService(GuestAuthService auth, GuestReservationHistoryPort history) {
        this.auth = auth;
        this.history = history;
    }

    public Page page(GuestPrincipal principal, int page, int size) {
        UUID account = account(principal);
        if (page < 0 || size < 1 || size > 50) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var result = history.readPage(account, page, size);
        return new Page(account, page, size, result.totalElements(), result.items());
    }

    public Detail detail(GuestPrincipal principal, UUID reservationId) {
        UUID account = account(principal);
        var reservation = history.readOne(account, reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return new Detail(account, reservation);
    }

    private UUID account(GuestPrincipal principal) {
        if (principal == null) throw new GuestAuthenticationException();
        return auth.getActivePrincipal(principal).guestAccountId();
    }

    public record Page(UUID guestAccountId, int page, int size, long totalElements,
            java.util.List<GuestReservationHistoryPort.Reservation> items) { }
    public record Detail(UUID guestAccountId, GuestReservationHistoryPort.Reservation reservation) { }
}
