# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0109

## Account / Stay Hub V3

**Tarea:** `IMP-AND-0109 — MOB-20 — Account / Stay Hub V3`
**Estado del contrato:** `APPROVED`
**Reviewer:** `WEB-2`
**Autoridad visual:** `1839:410 — APPROVED FOR IMPLEMENTATION — IMP-AND-0109 — Account / Stay Hub states`.

| Estado | Frame |
| --- | --- |
| Base | `1839:411 — MOB-20 — Cuenta / Mi estadía` |
| Loading | `1839:443 — MOB-20 — Cuenta / Loading` |
| Error | `1839:458 — MOB-20 — Cuenta / Error` |
| Offline | `1839:473 — MOB-20 — Cuenta / Offline` |

`31:154 — MOB-02 — Inicio / Mi estadía` permanece como referencia histórica. `MOB-20` lo sustituye funcionalmente como Account / Stay Hub V3.

## Dominio reutilizado

`IMP-AND-0109` reutiliza exclusivamente `ReservationStay`. No crea un segundo modelo de estadía ni amplia silenciosamente el dominio.

La UI puede mostrar los campos ya existentes:

- `roomType.name`;
- `room`, nullable;
- `arrival` y `departure`, incluido check-out como presentación de `departure`;
- `status`, dato de dominio opaco que no se renderiza crudo al huésped sin un mapeo de presentación aprobado;
- `reservationId`.

Si un elemento visual de Figma no está respaldado por estos campos, se registra como diferencia fixture/diseño. No se agrega al Domain en esta tarea.

## Data flow frontend-first

```text
currentStayFixture
  ↓
MockStayService
  ↓
ReservationStayDto
  ↓
mapReservationStayDto
  ↓
ReservationStay
  ↓
useCurrentStay / TanStack Query
  ↓
AccountStayHubScreen
```

La UI no importa fixtures ni DTOs y no ejecuta `fetch` directo. TanStack Query conserva la autoridad de server-like state; `RemoteState` sigue siendo derivado, no un store paralelo.

## Estados aprobados

- Base/success: `1839:411`;
- loading: `1839:443`;
- error: `1839:458`;
- offline: `1839:473`, mediante `NetworkError` simulado.

La habitación nullable debe mostrar un estado seguro sin inventar habitación. No se crea Empty: el dominio actual no modela ausencia total de estadía como resultado válido de esta tarea.

No se agregan NetInfo, cola offline, auto-retry especial, sincronización en segundo plano ni persistencia.

## Navegación

- Ruta: `/account`;
- Shell: `GuestNavigationShell` V3;
- Cuenta fue habilitada mediante `IMP-AND-0109`;
- `/account` y `/account/*` mantienen Cuenta activa;
- no existe quinta tab.

`MOB-02` histórico deja de ser la entrada productiva principal. No se crea un alias temporal de Stay sin una necesidad demostrada.

`IMP-AND-0109` inspeccionó y retiró `app/(guest)/index.tsx`, `StayHomeScreen` y sus pruebas; `app/index.tsx` redirige a `/account`. La pantalla histórica no coexiste como un segundo hub productivo equivalente.

## Dependencia futura de contexto

La query vigente sigue siendo la de estadía actual frontend/mock y este contrato no la cambia. `IMP-AND-0501` solo define `ActiveReservationContext` como identidad `{ reservationId, reservationStayId }` y la convención futura de key `['stay', reservationId, reservationStayId]`. `IMP-AND-0503` deberá adaptar el service/query de Stay, evitar selección implícita e invalidar datos reservation-scoped aprobados. Account/Profile y Rewards mantienen scope de cuenta; Promotions y Chat no se reasignan ni invalidan por inferencia.

## Fuera de alcance

Esta tarea no introduce `GuestAccount`, `GuestProfile`, preferencias, consentimientos, Rewards, promociones, cargos, Folio, Checkout, pagos, factura ni nuevas capacidades de Services.

`IMP-AND-0201` extenderá el mismo `/account`; no crea una segunda raíz ni reemplaza `ReservationStay`.

## Límite Backend

No hay Backend, endpoint, HTTP real, autenticación real, Firebase, WebSocket, persistencia ni contrato Backend. El fixture DTO es un boundary frontend/mock y no define la futura API.
