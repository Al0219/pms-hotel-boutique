package com.pms.hotelboutique.backend.modules.operations.domain;

/**
 * Operational outage kind on BD2's table. OOO discounts sellable capacity;
 * OOS is an operational condition without ATS impact (BD2 MVP rule).
 */
public enum OutageKind {
    OOO,
    OOS
}
