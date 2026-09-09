# Security Policy

## Nunca commitear
- passwords reales;
- access/refresh tokens;
- API keys;
- credenciales de proveedores;
- secretos OAuth;
- PAN completo;
- CVV;
- MFA seed/code;
- `.env` real;
- PII real de huéspedes.

## Datos de pruebas
Usar fixtures ficticios aprobados.
No copiar registros reales del hotel.

## Pagos
Permitido:
- payment id;
- provider ref;
- token opaco;
- last4 cuando aplique;
- status;
- amount;
- currency.

Prohibido:
- PAN completo;
- CVV;
- secretos de provider.

## Auth
Guest y Staff usan sesiones separadas.

## Property Scope
La UI puede ocultar/mostrar acciones, pero backend debe volver a autorizar.
No asumir acceso global.

## XSS
No usar `dangerouslySetInnerHTML` con contenido no confiable.

## Logs
No registrar secretos ni PII innecesaria.
