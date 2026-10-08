package com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence;

import java.time.LocalDate;

/** PostgreSQL projection: local date and distinct physical rooms unavailable that night. */
public interface OutOfOrderNightCount {
    LocalDate getNight();
    long getRoomCount();
}
