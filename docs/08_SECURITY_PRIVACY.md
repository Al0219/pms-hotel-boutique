# 08 — Security & Privacy

## Principios
- least privilege;
- data minimization;
- explicit property scope;
- session separation;
- granular consent.

## Guest vs Staff
No compartir session semantics.

## Consent
Registrar:
- purpose;
- channel;
- state;
- source;
- timestamp.

Revocar Marketing/SMS no revoca Marketing/Email.

## DSR
Anonimización/exportación respeta retenciones legales.

## Payments
No PAN/CVV.

## Secrets
No en frontend bundle.
No en repo.
No en logs.

## Multi-property
La UI no debe revelar existencia/datos de properties no autorizadas.

## Errors
No mostrar provider secrets, stack traces ni información sensible.
