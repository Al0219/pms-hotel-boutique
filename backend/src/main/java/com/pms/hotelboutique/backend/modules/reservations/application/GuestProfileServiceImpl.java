package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestAccount;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence.GuestAccountRepository;
import com.pms.hotelboutique.backend.modules.reservations.domain.GuestProfile;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.GuestProfileRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class GuestProfileServiceImpl implements GuestProfileService {

    private final GuestProfileRepository profiles;
    private final GuestAccountRepository accounts;

    public GuestProfileServiceImpl(GuestProfileRepository profiles, GuestAccountRepository accounts) {
        this.profiles = profiles;
        this.accounts = accounts;
    }

    @Override
    public GuestProfileView create(@Valid CreateGuestProfileCommand command) {
        Instant now = Instant.now();
        GuestProfile profile = new GuestProfile(UUID.randomUUID(), command.firstName(), command.lastName(), now);
        if (command.guestAccountId() != null) {
            GuestAccount account = accounts.findById(command.guestAccountId())
                    .orElseThrow(() -> new GuestProfileException("guest account not found"));
            if (!account.isActive()) {
                throw new GuestProfileException("guest account is not active");
            }
            profile.linkAccount(account);
        }
        if (command.propertyId() != null) {
            // Existence is enforced by the FK to properties (owned by BD1, no
            // JPA read model to reuse); no parallel property lookup is kept here.
            profile.assignProperty(command.propertyId());
        }
        profile.updateContact(command.firstName(), command.lastName(),
                blankToNull(command.email()), blankToNull(command.phone()),
                blankToNull(command.documentType()), blankToNull(command.documentNumber()),
                blankToNull(command.preferredLanguage()), now);
        return GuestProfileView.from(profiles.save(profile));
    }

    @Override
    public GuestProfileView updateContact(UUID profileId, @Valid UpdateGuestProfileCommand command) {
        GuestProfile profile = existing(profileId);
        profile.updateContact(command.firstName(), command.lastName(),
                blankToNull(command.email()), blankToNull(command.phone()),
                blankToNull(command.documentType()), blankToNull(command.documentNumber()),
                blankToNull(command.preferredLanguage()), Instant.now());
        return GuestProfileView.from(profile);
    }

    @Override
    public GuestProfileView activate(UUID profileId) {
        GuestProfile profile = existing(profileId);
        profile.activate(Instant.now());
        return GuestProfileView.from(profile);
    }

    @Override
    public GuestProfileView deactivate(UUID profileId) {
        GuestProfile profile = existing(profileId);
        profile.deactivate(Instant.now());
        return GuestProfileView.from(profile);
    }

    @Override
    @Transactional(readOnly = true)
    public GuestProfileView get(UUID profileId) {
        return GuestProfileView.from(existing(profileId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuestProfileView> findByAccount(UUID accountId) {
        if (accountId == null) {
            throw new GuestProfileException("account id is required");
        }
        return profiles.findByGuestAccount_Id(accountId).stream().map(GuestProfileView::from).toList();
    }

    private GuestProfile existing(UUID profileId) {
        if (profileId == null) {
            throw new GuestProfileException("profile id is required");
        }
        return profiles.findById(profileId)
                .orElseThrow(() -> new GuestProfileException("guest profile not found"));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
