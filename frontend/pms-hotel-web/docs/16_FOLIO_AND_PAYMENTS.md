# 16 — Folio and Payments

Owner: WEB-4.

## Folio
Tipos:
- Guest
- Company
- Master

## Charge routing
Regla determina destino.
No duplicar cargo.

## Split/Transfer
Conservar trazabilidad.

## Payment lifecycle
AUTHORIZATION -> CAPTURE -> REFUND/VOID según operación.

## Partial refund
No exceder captured amount.
Mantener refundable remaining.

## Data
No PAN/CVV.

## Provider refs
Mantener:
- payment id;
- provider ref;
- parent ref;
- external reference cuando aplica.

## Group/B2B
Room&tax puede ir company; extras guest según routing.

## UI
No optimistically mark SUCCEEDED antes de provider/backend confirmation.
