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

## Reparto vigente — 2026-10-03

El usuario confirma que José deja la implementación Backend y pasa al Frontend.
Alan / BD1 y Juan / BD3 continúan el Backend, incluidos los pendientes de BD2.
El reparto específico de esos pendientes debe acordarse entre ambos; documento
`backend/docs/23_BD2_BACKEND_HANDOVER.md` contiene propuesta, entregas y límites.
No se reasignan automáticamente módulos Frontend ni se aprueban contratos nuevos.
Los owners de entregas anteriores se conservan como autoría histórica.
Decisión registrada en DEC-B-010; seguimiento en AlanPlan/AlanHandoff.

## Reparto anterior — 2026-10-02

Autorizado por el usuario tras el cierre de inventario BD2 (PR #72 integrado).

| Integrante | Alcance de la siguiente etapa |
| --- | --- |
| Alan / BD1 | Integraciones y analítica; administración y cumplimiento |
| José / BD2 | Folio y Payments: garantía pública, consultas, authorize/capture/void/refund, split/routing/transfer e invoices; lifecycle: cancelación, no-show, waitlist/conversión, room move y extensión |
| Juan / BD3 | Operaciones: HK, mantenimiento, OOO/OOS, conserjería, valet, mensajería y night audit; Comercial/B2B: empresas/agencias, grupos/blocks/master folio, promociones/rewards, compras y cuentas por cobrar |

Reutilizar servicios ya implementados. El motor financiero sigue siendo único:
BD3 gestiona el vínculo comercial del master folio y BD2 sus movimientos/pagos.
BD2 coordina lifecycle con BD3 para HK, night audit, tarifas y blocks, y con BD1
para seguridad, integraciones y acceso Guest. Cambios compartidos requieren
revisión del owner afectado; el reparto no aprueba nuevas reglas o contratos.

Seguimiento Backend: `backend/docs/AlanPlan.md` y `AlanHandoff.md`.
Detalle de fase 0: `backend/docs/19_BD2_FINANCE_LIFECYCLE_PHASE0.md`.

No asumir automáticamente que ownership Frontend = ownership Backend.

---

## Structure Freeze Web

Se autoriza crear los módulos oficiales de Web como shells de coordinación (`README.md` e `index.ts`) para los cuatro integrantes. No contienen lógica funcional ni capas internas y no modifican estados del backlog. Las capas de cada módulo nacen solamente con la tarea READY correspondiente.
