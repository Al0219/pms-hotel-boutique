# 06 — Team Structure

## Equipo

5 integrantes:
- 4 Web
- 1 Android

Backend se redistribuirá cuando inicie esa fase.

Ownership reduce conflictos; no crea silos.

---

# WEB-1 — Booking público

## Figma
- Public 01 Booking público
- Public 03 Multi-room
- Public 04 Checkout y confirmación

## Ownership
- booking
- checkout
- multi-room
- rooms UI pública

## Flujos principales
- Search
- Availability results
- Room detail
- Add/select room
- Multi-room cart
- Occupants per stay
- Guest data
- Guarantee/payment step
- Confirmation

## Dependencias
- Availability core: WEB-4
- Auth optional: WEB-2
- Payment UI integration: WEB-4

## Reviewer requerido
WEB-4 si modifica availability/rates/payment core.
WEB-2 si modifica auth/account flow.

---

# WEB-2 — Identity / Account / Security / Multi-property

## Figma
- Public 02 Identidad y cuenta
- Public 05 Cuenta, historial, rewards y promociones
- Private 07 Security / Privacy / Access
- Private 09 Multi-property

## Ownership
- auth
- account
- profile
- rewards
- promotions
- privacy
- permissions
- security
- properties

## Flujos
- Google optional
- email access
- GuestAccount
- profile
- reservations history
- rewards
- promotions
- consent
- sessions
- MFA
- property switcher
- multi-property dashboard/search

## Reviewer
WEB-3 para reservation history semantics.
WEB-4 para multi-property revenue/availability metrics.

---

# WEB-3 — Reservations / Operations / B2B / Integrations / Reporting UI

## Figma
- Private 01 Reservation Engine
- Private 03 Operations
- Private 05 B2B / Groups
- Private 06 Integrations
- Private 08 Reporting

## Ownership
- reservations
- stays
- housekeeping
- maintenance
- companies
- agencies
- groups
- integrations
- reports

## Flujos
- cancellation
- no-show
- waitlist
- room move
- stay extension
- discrepancy
- inspection reject
- OOO/OOS flow
- company/agency
- group/block/pickup/rooming
- Integration Center
- Error Queue

## Reviewer
WEB-4 para Folio/Payment/Availability impacts.
WEB-2 para permissions/security integrations.

---

# WEB-4 — Folio / Payments / Commercial / Revenue

## Figma
- Private 02 Folio & Payments
- Private 04 Commercial / Availability / Revenue

## Ownership
- folio
- payments
- receivables
- availability
- rates
- inventory
- revenue
- channels

## Flujos
- folio detail
- routing
- split
- transfer
- authorization/capture/void/refund
- ATS
- restrictions
- MinLOS
- CTA/CTD
- sell limits
- overbooking
- forecast
- pickup/pace
- ADR/RevPAR
- channel mix

## Reviewer
WEB-1 para public booking consumption.
WEB-3 para reservation/group side effects.

---

# ANDROID-1

## Ownership
Aplicación Android completa.

## Figma
`Implementation Ready — Android V2 + V3`

Grupos:
1. Estancia y servicios
2. Cuenta, checkout y factura
3. Loyalty, promociones y perfil
4. Loading, error y offline

## Coordinación
Debe respetar mismos conceptos/estados/contratos cross-app.

---

# Shared

No pertenece a un integrante.

Cambio significativo:
- reviewer adicional;
- confirmar reutilización real;
- no romper API pública.

---

# Backend

Antes de iniciar se definirá nuevo reparto.

No asumir automáticamente que ownership Frontend = ownership Backend.

---

## Structure Freeze Web

Se autoriza crear los módulos oficiales de Web como shells de coordinación (`README.md` e `index.ts`) para los cuatro integrantes. No contienen lógica funcional ni capas internas y no modifican estados del backlog. Las capas de cada módulo nacen solamente con la tarea READY correspondiente.
