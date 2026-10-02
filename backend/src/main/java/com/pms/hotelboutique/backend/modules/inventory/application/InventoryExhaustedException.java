package com.pms.hotelboutique.backend.modules.inventory.application;

/** Business rejection raised before the admission callback is executed. */
public class InventoryExhaustedException extends RuntimeException {
    public InventoryExhaustedException() {
        super("Insufficient sellable inventory for the requested stays");
    }
}
