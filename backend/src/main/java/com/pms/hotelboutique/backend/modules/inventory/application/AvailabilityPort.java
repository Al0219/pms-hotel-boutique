package com.pms.hotelboutique.backend.modules.inventory.application;

import java.util.UUID;

/**
 * Internal query contract for BD3. Returns the minimum sellable units across
 * all nights in dates, for the specified property and room type.
 * The caller must already be authorized for the property. This query neither
 * reserves inventory nor guarantees atomic admission of a reservation.
 * See backend/docs/11_BD2_CORE_FOUNDATION_CONTRACT.md.
 */
public interface AvailabilityPort {
    int calculateATS(UUID propertyId, UUID roomTypeId, StayDateRange dates);
}
