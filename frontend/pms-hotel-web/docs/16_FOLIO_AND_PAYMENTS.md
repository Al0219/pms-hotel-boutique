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

## Folio mínimo real en detalle de reserva Staff

Incremento full stack autorizado a José, contrato Backend61 confirmado2026-10-26.
IMP-WEB-0302/0401: sesión Staff, propiedad explícita y FOLIO_PAYMENT_OPERATE.
El panel usa /api/staff/folios; no las rutas financieras históricas de mocks.
Presenta folios vinculados, saldo exacto y movimientos paginados. Folio ausente
o sin movimientos significa saldo no verificable, no pago confirmado.

Registro de pagos recibidos: abonos o total, positivos, hasta el saldo vivo y
en moneda del folio, sin conversión ni PSP. Confirmación explícita, sin tarjetas.
PAYMENT negativo reduce deuda; no cierra el folio ni permite checkout con deuda
en otro folio. Movimiento, auditoría y recibo idempotente son atómicos.

Referencias pendientes no secretas se conservan en sessionStorage por actor/
propiedad/reserva/folio para recuperar la misma operación tras recargar. Un
resultado incierto bloquea nuevos pagos en ese folio hasta resolverlo; no hay
éxito optimista. Cierre de sesión limpia referencias/caché Staff. Después de
volver a acceder, revisar movimientos antes de registrar otro pago.

No completa folio avanzado, split/routing/transfer/invoices ni el ciclo PSP.
Guía QA manual y evidencia en Backend61; incremento EN_QA, no COMPLETADO.
Regresión cercana78 PASS y Chrome real13 PASS; suite general conserva tres
fallos locales documentados por separado. Pendientes QA manual y CI general.
