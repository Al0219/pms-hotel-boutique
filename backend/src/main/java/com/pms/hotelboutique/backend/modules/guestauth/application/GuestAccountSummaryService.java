package com.pms.hotelboutique.backend.modules.guestauth.application;

import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence.GuestAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
// A link committed between count and next-stay reads must not produce an inconsistent summary.
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class GuestAccountSummaryService {
    private final GuestAuthService auth;
    private final GuestAccountRepository accounts;
    private final GuestAccountSummaryPort details;

    public GuestAccountSummaryService(GuestAuthService auth, GuestAccountRepository accounts, GuestAccountSummaryPort details) {
        this.auth = auth;
        this.accounts = accounts;
        this.details = details;
    }

    public GuestAccountSummaryView ownSummary(GuestPrincipal principal) {
        if (principal == null) throw new GuestAuthenticationException();
        GuestPrincipal active = auth.getActivePrincipal(principal);
        var account = accounts.findById(active.guestAccountId()).filter(a -> a.isActive())
                .orElseThrow(GuestAuthenticationException::new);
        var data = details.readForAccount(account.getId());
        return new GuestAccountSummaryView(account.getId(), account.getEmail(), account.isActive(),
                data.profiles(), data.linkedReservationsCount(), data.upcomingStay());
    }
}
