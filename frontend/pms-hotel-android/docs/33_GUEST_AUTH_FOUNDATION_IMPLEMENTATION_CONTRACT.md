# 33 — Guest Auth + Reservation Context foundation

**Tarea:** `IMP-AND-0501 — Guest Auth + Reservation Context foundation`  
**Estado:** `EN_QA` — validación automática completada; pendiente revisión final  
**Owner:** `ANDROID-1`  
**Reviewer:** `WEB-2`  
**Estrategia:** frontend-first, mock/local y exclusivamente session-only.

## Principio

> La cuenta identifica al huésped; la reserva identifica la estadía que está utilizando.

`GuestAuthSession`, `GuestAccount`, `GuestProfile`, `Reservation`, `ReservationStay`, `LinkedReservations` y `ActiveReservationContext` permanecen separados. Una `Reservation` puede tener más de un `ReservationStay`; por ello el contexto identifica ambos IDs y nunca copia una estadía.

## Alcance de 0501

Se autorizan contratos Domain, DTO/mapper local para la proyección de selección, interfaces de service, mocks sustituibles, Providers en memoria, un resolver puro y pruebas unitarias. No se autorizan UI de Login/selector, rutas, guards, redirects, cambios de `useCurrentStay` ni invalidaciones reales.

No hay Backend, HTTP real, tokens, refresh, cookies, hashing local, biometría, AsyncStorage, SecureStore, password persistence ni integración de autenticación real.

## Contratos

```ts
type GuestAuthSession = { accountId: string };
type GuestLoginRequest = { email: string; password: string };

type ActiveReservationContext = {
  reservationId: string;
  reservationStayId: string;
};

type LinkedReservationSummary = {
  reservationId: string;
  reservationStayId: string;
  reference: string;
  propertyLabel?: string;
  arrival: string;
  departure: string;
  roomLabel?: string | null;
  statusLabel?: string;
};
```

`GuestAuthSession` no contiene password, token, profile, reservation ni stay. El password solo vive durante `GuestAuthService.login(request)` y no se registra ni persiste. `LinkedReservationSummary` es una proyección segura para seleccionar; no sustituye `ReservationStay` ni contiene servicios, solicitudes, Valet, checkout o invoice.

`GuestAccount` se reutiliza desde el contrato canónico de Account/Profile (`IMP-AND-0201/0202`). `GuestAccountService.getCurrent(session)` lo resuelve desde `session.accountId`; no introduce un modelo o fixture de Account duplicados.

## Boundaries y errores

```text
GuestLoginRequest → GuestAuthService → GuestAuthSession
LinkedReservationSummaryDto → mapper puro → LinkedReservationSummary
GuestAuthSession → GuestAccountService → GuestAccount canónico
```

`MockGuestAuthService` puede expresar éxito, `InvalidGuestCredentialsError`, error genérico y `NetworkError`. El error de credenciales es interno; una UI futura debe presentar copy genérico. `MockLinkedReservationsService` admite fixtures explícitos de cero, una, múltiples, error y offline. Ninguno representa API, endpoint, token o permiso Backend.

## Estado en memoria

`GuestAuthSessionProvider` expone `session`, `beginSession` y `clearSession`. `ActiveReservationContextProvider` expone `activeReservationContext`, `setActiveReservationContext` y `clearActiveReservationContext`. Ambos inician en `null` en un cold start y no tienen persistencia ni navegación implícita.

## Resolución pura

`resolveLinkedReservationOutcome(reservations)` no navega ni muta estado:

| Cantidad | Resultado |
| --- | --- |
| 0 | `EMPTY` |
| 1 | `AUTO_SELECT` con `ActiveReservationContext` derivado del único summary |
| 2+ | `REQUIRES_SELECTION` |

La convención futura de cache es `['stay', reservationId, reservationStayId]`, expuesta por `reservationContextKey`. `IMP-AND-0501` no migra `useCurrentStay` ni ninguna query productiva; eso corresponde a `IMP-AND-0503`.

## Scope para invalidación futura

| Clasificación | Capacidades |
| --- | --- |
| Account-scoped | Account/Profile, Rewards |
| Reservation-scoped | Stay, Services, solicitudes de sesión, Valet/Transfer, Checkout, Invoice |
| Sin resolver | Promotions, Chat |

No se invalida Promotions ni Chat por inferencia. La invalidez/limpieza real al cambiar contexto se decide e implementa en `IMP-AND-0503`.

## Navegación y Access

`IMP-AND-0501` no crea `/login` ni `/reservations`, no cambia `/`, y no monta sus Providers en las rutas productivas. Login y Reservations tienen autoridad visual **frontend-first aprobada**: al implementar `0502/0503` reutilizarán tokens y componentes Android existentes; no requieren un frame Figma para iniciar. Figma sigue siendo guía visual futura, no bloqueador.

`/access` sigue siendo código de reserva + email, fuera de la shell y sin `GuestAuthSession`. En `0503` podrá resolver un `ActiveReservationContext` temporal únicamente si su contrato lo autoriza; nunca inferirá una cuenta autenticada o una reserva vinculada a cuenta.

## Secuencia y gates

```text
0501 → 0502 → 0503 → 0504 → IMP-AND-0116 → Android Release
```

- `0502`: Login Guest y estados visuales, sin seleccionar estadía por intuición.
- `0503`: Linked Reservations, selector, guards de rutas, migración context-aware de Stay e invalidación reservation-scoped aprobada.
- `0504`: QA del journey completo.
- `0116`: conserva sus blockers de fuente visual, confirmación y estrategia de cache; `0501–0503` solo cubren parte de su prerequisito.

## Pruebas de 0501

Pruebas unitarias cubren sesión mínima, éxito/error/offline de Auth, credenciales inválidas, la proyección de selección, fixtures linked 0/1/múltiples/error/offline, resolución pura, set/replace/clear de contexto, set/clear de sesión y la convención de query key. No hay pruebas UI de Login ni selector en esta tarea.
