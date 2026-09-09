# 09 — Service Rules

## Decisión aprobada
Web usa `fetch` nativo detrás de infraestructura común en `src/lib/http`.

## Service MUST
- disparar request mediante el cliente común;
- retornar DTO;
- tipar request/response;
- manejar status/errores técnicos;
- mantener detalles de transporte fuera de UI.

## Service MUST NOT
- mapear Domain;
- mostrar toast;
- navegar;
- devolver JSX;
- decidir copy;
- formatear para UI.

## Sprint 0
`lib/http` puede centralizar base URL, headers, AbortSignal y errores HTTP técnicos.

Autenticación real e inyección de tokens se difieren. No usar `localStorage` como solución predeterminada.

No centralizar todos los endpoints en un archivo gigante y no inventar endpoints durante Sprint 0.

## Implementación Sprint 0

`src/lib/http/client.ts` expone una request genérica que resuelve base URL, headers, body y `AbortSignal`. Sus errores técnicos son `HttpStatusError` y `HttpNetworkError`. No contiene endpoints ni semántica de dominio.
