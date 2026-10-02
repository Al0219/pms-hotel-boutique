package com.pms.hotelboutique.backend.modules.inventory.application;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Authorize property scope before calling. Checks the entire demand and runs
 * persistence in the same READ_COMMITTED transaction while holding room-type
 * locks until commit/rollback. Every stock-consuming writer must participate.
 * The callback must persist precisely this demand, without external side effects.
 * This port does not create reservations, stays, guests or audit events itself.
 */
public interface InventoryAdmissionPort {
    <T> T admit(UUID propertyId, List<InventoryDemand> demand, Supplier<T> persistence);
}
