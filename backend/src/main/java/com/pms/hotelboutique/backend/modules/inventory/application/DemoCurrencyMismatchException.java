package com.pms.hotelboutique.backend.modules.inventory.application;

import java.util.Currency;

/** Internal pricing configuration error; no implicit currency conversion. */
public class DemoCurrencyMismatchException extends IllegalStateException {
    public DemoCurrencyMismatchException(Currency propertyCurrency, Currency demoCurrency) {
        super("DEMO_CURRENCY_MISMATCH: property currency " + propertyCurrency.getCurrencyCode()
                + "; demo currency " + demoCurrency.getCurrencyCode());
    }
}
