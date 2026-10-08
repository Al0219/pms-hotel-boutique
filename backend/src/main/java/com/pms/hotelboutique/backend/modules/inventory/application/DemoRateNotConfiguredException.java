package com.pms.hotelboutique.backend.modules.inventory.application;

/** Internal configuration error; HTTP translation belongs to future public APIs. */
public class DemoRateNotConfiguredException extends IllegalStateException {
    public DemoRateNotConfiguredException(String roomTypeCode) {
        super("DEMO_RATE_NOT_CONFIGURED: " + roomTypeCode);
    }
}
