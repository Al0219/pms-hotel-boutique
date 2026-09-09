# 05 — Module Catalog

## booking
Owner WEB-1.
Public booking journey.

## checkout
Owner WEB-1.
Guest data + checkout composition.

## auth
Owner WEB-2.
Guest/Staff client auth states.

## account/profile
Owner WEB-2.

## rewards/promotions
Owner WEB-2.

## properties
Owner WEB-2.
Property switch/multi-property UI.

## reservations/stays
Owner WEB-3.

## housekeeping/maintenance
Owner WEB-3.

## companies/agencies/groups
Owner WEB-3.

## integrations
Owner WEB-3.

## reports
Owner WEB-3.

## folio/payments/receivables
Owner WEB-4.

## availability/rates/inventory/revenue/channels
Owner WEB-4.

## guests/rooms
Dominio compartido semánticamente.
Owner principal se define por tarea:
- rooms public presentation: WEB-1
- operational rooms: WEB-3
- inventory math: WEB-4

No duplicar `Room` model en tres módulos sin decisión.

## Structure Freeze autorizado

Para repartir trabajo, los módulos oficiales se scaffoldan con `README.md` e `index.ts` exclusivamente. Los shells no cambian el estado de ninguna tarea funcional del backlog. El mapa completo, incluidos módulos de soporte operativo, está en `src/modules/README.md`.
