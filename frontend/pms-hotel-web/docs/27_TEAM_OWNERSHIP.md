# 27 — Team Ownership Web

## WEB-1

### Owned folders esperadas
- modules/booking
- modules/checkout
- public-facing parts of rooms/multi-room

### Can consume
- availability API pública
- auth API pública
- payments API pública

### Requires reviewer
- availability core -> WEB-4
- auth -> WEB-2
- payments -> WEB-4

### E2E
Guest booking, Google handoff integration, multi-room, recurrence/promo public.

---

## WEB-2

### Owned
- auth
- account
- profile
- rewards
- promotions
- privacy
- permissions
- security
- properties

### Reviewer dependencies
Reservation history -> WEB-3
Revenue metrics in multi-property -> WEB-4

---

## WEB-3

### Owned
- reservations
- stays
- housekeeping
- maintenance
- companies
- agencies
- groups
- integrations
- reports UI

### Reviewer dependencies
Folio/payment -> WEB-4
Availability -> WEB-4
Security permissions -> WEB-2

---

## WEB-4

### Owned
- folio
- payments
- receivables
- availability
- rates
- inventory
- revenue
- channels

### Reviewer dependencies
Public booking consumption -> WEB-1
Reservation/group side effects -> WEB-3

---

## Shared
No owner exclusivo.

## Reemplazar
WEB-1..4 por nombres y usernames reales antes del primer Sprint.
