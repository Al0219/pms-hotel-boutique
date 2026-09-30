package com.pms.hotelboutique.backend.modules.reservations.domain;

import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * BD3 demographic/contact identity of a guest.
 *
 * A profile may exist without an account (walk-in occupant, booking guest
 * without Google login) and may optionally link to one {@link GuestAccount}
 * and one property. It never carries authentication state: that belongs to
 * BD1's GuestAccount. No delete API is offered; history is preserved.
 */
@Entity
@Table(name = "guest_profiles")
public class GuestProfile {

    public enum Status {
        ACTIVE,
        INACTIVE
    }

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guest_account_id")
    private GuestAccount guestAccount;

    /**
     * Optional property link. Kept as a raw id on purpose: BD1 owns the
     * properties table and exposes no JPA read model to reuse.
     */
    @Column(name = "property_id")
    private UUID propertyId;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "email")
    private String email;

    @Column(name = "phone")
    private String phone;

    @Column(name = "document_type")
    private String documentType;

    @Column(name = "document_number")
    private String documentNumber;

    @Column(name = "preferred_language")
    private String preferredLanguage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected GuestProfile() {
    }

    public GuestProfile(UUID id, String firstName, String lastName, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        requireName(firstName, "firstName");
        requireName(lastName, "lastName");
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.firstName = firstName.trim();
        this.lastName = lastName.trim();
        this.status = Status.ACTIVE;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void linkAccount(GuestAccount account) {
        if (account == null) {
            throw new IllegalArgumentException("account is required");
        }
        this.guestAccount = account;
    }

    public void unlinkAccount() {
        this.guestAccount = null;
    }

    public void assignProperty(UUID propertyId) {
        this.propertyId = propertyId;
    }

    public void clearProperty() {
        this.propertyId = null;
    }

    public void updateContact(String firstName, String lastName, String email, String phone,
            String documentType, String documentNumber, String preferredLanguage, Instant now) {
        requireName(firstName, "firstName");
        requireName(lastName, "lastName");
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.firstName = firstName.trim();
        this.lastName = lastName.trim();
        this.email = email;
        this.phone = phone;
        this.documentType = documentType;
        this.documentNumber = documentNumber;
        this.preferredLanguage = preferredLanguage;
        this.updatedAt = now;
    }

    public void deactivate(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.status = Status.INACTIVE;
        this.updatedAt = now;
    }

    public void activate(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.status = Status.ACTIVE;
        this.updatedAt = now;
    }

    public boolean isActive() {
        return status == Status.ACTIVE;
    }

    private static void requireName(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
    }

    public UUID getId() {
        return id;
    }

    public GuestAccount getGuestAccount() {
        return guestAccount;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getDocumentType() {
        return documentType;
    }

    public String getDocumentNumber() {
        return documentNumber;
    }

    public String getPreferredLanguage() {
        return preferredLanguage;
    }

    public Status getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
