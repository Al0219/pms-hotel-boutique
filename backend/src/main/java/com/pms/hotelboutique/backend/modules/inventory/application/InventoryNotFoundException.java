package com.pms.hotelboutique.backend.modules.inventory.application;

public class InventoryNotFoundException extends RuntimeException {
    public InventoryNotFoundException() {
        super("Room type not found in the authorized property");
    }
}
