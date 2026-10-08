package com.pms.hotelboutique.backend.modules.securityauth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "staff_users")
public class StaffUser {
    public enum Status { ACTIVE, SUSPENDED, DISABLED }

    @Id
    private UUID id;
    @Column(nullable = false, unique = true)
    private String username;
    @Column(name = "work_email", nullable = false, unique = true)
    private String workEmail;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(name = "role_code", nullable = false)
    private String roleCode;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Version
    @Column(nullable = false)
    private long version;

    protected StaffUser() { }

    public StaffUser(UUID id, String username, String workEmail, String passwordHash, String roleCode, Instant now) {
        this.id = id;
        this.username = username;
        this.workEmail = workEmail;
        this.passwordHash = passwordHash;
        this.roleCode = roleCode;
        this.status = Status.ACTIVE;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public String getUsername() { return username; }
    public String getWorkEmail() { return workEmail; }
    public String getPasswordHash() { return passwordHash; }
    public String getRoleCode() { return roleCode; }
    public Status getStatus() { return status; }
    public long getVersion() { return version; }
    public boolean isActive() { return status == Status.ACTIVE; }
}
