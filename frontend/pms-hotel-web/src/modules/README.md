# Web Module Map

This Structure Freeze defines ownership entry points only. A module shell is not a feature implementation and does not change functional backlog status.

| Module | Owner | Reviewer principal | Scope | Depends on |
| --- | --- | --- | --- | --- |
| `booking` | WEB-1 | WEB-4 / WEB-2 | Public booking, multi-room draft, and public room-selection composition. | availability, rooms, auth, payments |
| `checkout` | WEB-1 | WEB-4 / WEB-2 | Guest checkout composition, booking-guest data, guarantee, and confirmation composition. | booking, payments, reservations, auth |
| `auth` | WEB-2 | WEB-1 | Guest and staff authentication boundaries and client auth states. | account, profile |
| `account` | WEB-2 | WEB-3 | Guest account access, linked reservation history, and account preferences. | auth, profile, reservations, rewards, promotions |
| `profile` | WEB-2 | WEB-3 | GuestProfile identity and contact presentation independent of GuestAccount. | account, guests |
| `guests` | WEB-2 | WEB-3 | Guest identity and CRM-facing guest presentation. | profile, crm, reservations |
| `crm` | WEB-2 | WEB-3 | CRM-facing guest relationships and customer-management presentation. | guests, profile, properties |
| `rewards` | WEB-2 | WEB-3 | Rewards read models and ledger presentation. | account, reservations |
| `promotions` | WEB-2 | WEB-1 | Promotion eligibility and presentation. | booking, checkout, rates |
| `privacy` | WEB-2 | WEB-3 | Consent, privacy, and DSR presentation. | account, profile, security |
| `permissions` | WEB-2 | WEB-3 | Permission presentation and role capability boundaries. | security, staff, properties |
| `security` | WEB-2 | WEB-3 | Security-session presentation and sensitive-action boundaries. | auth, permissions, privacy |
| `properties` | WEB-2 | WEB-4 | Property-scope presentation and authorized-property context. | availability, revenue, permissions |
| `staff` | WEB-2 | WEB-3 | Staff and personnel administration presentation. | permissions, security, properties |
| `audit` | WEB-2 | WEB-3 | AuditTrail presentation for sensitive, append-only history. | security, permissions, reservations, payments |
| `reservations` | WEB-3 | WEB-4 / WEB-2 | Reservation Engine and Reservation-to-Stay operational presentation. | stays, guests, availability, folio, payments |
| `stays` | WEB-3 | WEB-4 | ReservationStay presentation and stay-level operations. | reservations, rooms, availability |
| `rooms` | WEB-3 | WEB-4 / WEB-1 | Physical Room operational semantics and room operations presentation. | stays, housekeeping, maintenance, inventory |
| `housekeeping` | WEB-3 | WEB-4 | Housekeeping lifecycle presentation and readiness status. | rooms, maintenance |
| `maintenance` | WEB-3 | WEB-4 | Maintenance orders, OOO/OOS, and operational status. | rooms, housekeeping, inventory |
| `concierge` | WEB-3 | WEB-2 | Internal concierge operations and reception coordination. | messaging, reservations, guests |
| `parking-valet` | WEB-3 | WEB-2 | Parking and valet operations presentation. | reservations, guests |
| `messaging` | WEB-3 | WEB-2 | Operational messaging routed through Reception. | concierge, guests, reservations |
| `companies` | WEB-3 | WEB-4 | Company B2B presentation and property-scoped agreements. | agencies, groups, receivables, folio |
| `agencies` | WEB-3 | WEB-4 | Agency contracts, commission, and voucher presentation. | companies, groups, receivables |
| `groups` | WEB-3 | WEB-4 | Group lifecycle, room blocks, pickup, rooming lists, and master folio composition. | reservations, stays, folio, availability |
| `integrations` | WEB-3 | WEB-2 / WEB-4 | Integration Center, health, mappings, and error-queue presentation. | channels, payments, security, properties |
| `reports` | WEB-3 | WEB-4 / WEB-2 | Reporting presentation without redefining source metrics. | revenue, availability, properties, permissions |
| `folio` | WEB-4 | WEB-3 | Guest, company, and master folio presentation. | payments, receivables, reservations, groups |
| `payments` | WEB-4 | WEB-3 / WEB-1 | Payment lifecycle presentation without PAN or CVV. | folio, receivables, checkout |
| `receivables` | WEB-4 | WEB-3 | Receivables and Direct Bill presentation. | folio, companies, agencies |
| `cash` | WEB-4 | WEB-3 | Cashier and cash-operation presentation. | folio, payments |
| `availability` | WEB-4 | WEB-1 / WEB-3 | Sellable availability and ATS presentation, separate from physical inventory. | rates, inventory, reservations, rooms |
| `rates` | WEB-4 | WEB-1 | RatePlan and restrictions presentation. | availability, revenue, channels |
| `inventory` | WEB-4 | WEB-3 | Physical inventory and sellable-impact presentation. | rooms, maintenance, availability |
| `revenue` | WEB-4 | WEB-2 / WEB-3 | Revenue metrics and forecasting presentation. | availability, rates, channels, properties |
| `channels` | WEB-4 | WEB-3 | Distribution channel and channel-mix presentation. | rates, availability, integrations, revenue |
| `purchases` | WEB-4 | WEB-3 | Purchasing and procurement presentation. | inventory, properties |
| `night-audit` | WEB-4 | WEB-3 | Night Audit presentation and business-date closing controls. | folio, payments, reservations, properties |

Cross-module code must use `@/modules/<module>` once an intentional public API exists. Module internals stay private.
