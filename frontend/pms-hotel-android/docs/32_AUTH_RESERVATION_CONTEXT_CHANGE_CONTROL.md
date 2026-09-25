# 32 — Change Control: Cuenta, acceso y contexto de reserva

**Estado:** `APPROVED FOR IMPLEMENTATION` para `IMP-AND-0501`; `0502–0504` siguen pendientes.
**Alcance:** foundation frontend-first session-only para Auth/Context; no implementa UI Login, selector, persistencia ni rutas nuevas.

## Problema

El flujo Guest actual usa código de reserva y correo para entrar al Account / Stay Hub. Esa experiencia fue útil como acceso frontend/mock, pero no separa con precisión quién es el huésped de qué estadía está usando. También se detectaron dos ajustes de producto para Profile: debe ser la primera acción del drawer y su confirmación de cambios sin guardar no debe ocultar la pantalla.

## Principio

> La cuenta identifica al huésped; la reserva identifica la estadía que está utilizando.

`GuestAccount`, `Reservation`, `ReservationStay` y su contexto activo son conceptos distintos. Una cuenta puede tener cero, una o varias reservas vinculadas; una reserva no es la sesión de identidad.

## Modelo conceptual congelado

| Concepto | Representa | No representa |
| --- | --- | --- |
| `GuestAuthSession` | Identidad de cuenta autenticada y su estado de autenticación. | Reserva activa, `ReservationStay`, servicios o datos de una estadía. |
| `GuestAccount` | Identidad, contacto, privacidad y preferencias de cuenta ya separadas por `IMP-AND-0201`. | La reserva activa ni un contenedor de servicios. |
| `LinkedReservations` | Colección de reservas asociadas a la cuenta. Puede estar vacía, tener una o varias reservas; los estados Backend se definirán por contrato futuro. | La autenticación ni la selección actual. |
| `ActiveReservationContext` | La reserva que la app Guest utiliza actualmente. | La identidad de cuenta ni una sustitución de `ReservationStay`. |

Este Change Control no define IDs, estados de Backend, endpoints, tokens ni payloads. Los boundaries frontend/mock futuros podrán representar estos conceptos session-only sin afirmar integración remota.

## Flujos futuros

### Cuenta

```text
Correo + contraseña
→ GuestAuthSession
→ cargar GuestAccount
→ cargar LinkedReservations
→ resolver o seleccionar ActiveReservationContext
```

El proyecto podrá simular este flujo con contracts, services, mocks, TanStack Query/Mutation y estado de sesión. No se implementan Backend auth, tokens, refresh, hashing local, biometría, ni almacenamiento de contraseñas. Una contraseña nunca se guarda en AsyncStorage, logs, fixtures visibles al huésped ni source control.

“Crear cuenta” queda como capacidad conceptual. Sus campos, ruta, contrato y tarea siguen pendientes de autoridad específica.

### Acceso temporal a una estadía

`IMP-AND-0108` sigue siendo válido. Su flujo código de reserva + correo se reclasifica como **Acceder a una estadía**: da acceso temporal a una reserva concreta y no es el login principal de cuenta. El contrato vigente continúa sin sesión real ni persistencia; una migración futura deberá hacer que el éxito resuelva `ActiveReservationContext`, sin crear `GuestAuthSession` por inferencia.

### Resolución y cambio de la reserva activa

- Con cero reservas vinculadas, la futura experiencia muestra un estado sin reservas y solo permitirá vincular una si el contrato correspondiente lo autoriza.
- Con una reserva relevante, la UI puede seleccionarla automáticamente para reducir pasos.
- Con varias reservas, la UI debe presentar un selector accesible antes de fijar `ActiveReservationContext`.
- Al cambiarla, se invalidarán o recargarán los datos reservation-scoped: Stay, habitación, Servicios, solicitudes, Valet, Checkout e Invoice.

Las pantallas/rutas futuras de Login y Reservations tienen autoridad visual frontend-first aprobada y reutilizarán tokens/componentes Android; Figma sigue como guía futura, no bloqueador. `IMP-AND-0501` no las implementa. `IMP-AND-0502` implementará Login y `IMP-AND-0503` el selector/contexto con sus pruebas y guards autorizados.

## Matriz de scope

| Candidato | Scope congelado o conclusión |
| --- | --- |
| `GuestAuthSession` | Account/auth scoped; todavía sin implementación. |
| `GuestAccount`, Profile, preferencias y consentimientos | Account-scoped. |
| Rewards | Account-scoped según su contrato vigente; no deriva datos de la estadía para presentación. |
| Promotions | No definido: la ruta vive bajo Account, pero la elegibilidad futura puede requerir cuenta, reserva, rate plan u otro contexto. No se invalida ni se reasigna sin contrato. |
| `ReservationStay`, habitación y Stay Hub | Reservation-scoped. |
| Servicios, solicitudes y Valet | Reservation-scoped. |
| Checkout e Invoice | Reservation-scoped. |
| Chat | No definido: el fixture contiene texto de referencia de estadía, pero su contrato no confirma si el scope futuro es account, property o reservation. |

## Impacto sobre tareas existentes

### IMP-AND-0108 — Access / Vincular reserva

Permanece `COMPLETADA`. Su semántica futura es acceso temporal a una estadía mediante reserva + correo; no se borra ni se convierte retroactivamente en login de cuenta. Requiere una migración posterior cuando exista `ActiveReservationContext` autorizado.

### IMP-AND-0116 — Desvincular reserva y cambiar estadía

Sigue `PENDIENTE`. `GuestAuthSession`, `LinkedReservations` y `ActiveReservationContext` son parte de su prerequisito formal de contexto/sesión real, junto con fuente visual y estrategia de cache. Este Change Control no resuelve los demás blockers ni lo vuelve `READY`. La tarea puede absorber la UX futura de desvincular/cambiar una estadía una vez aprobada la foundation; no debe implementar auth por sí sola.

### IMP-AND-0202 — Cuenta/Perfil

Profile sigue siendo válido y reutiliza la foundation de `IMP-AND-0201`. `IMP-AND-0202` implementó exclusivamente estos ajustes y está `COMPLETADA`: QA automática, QA manual y WEB-2 PASS.

1. **Drawer:** `Perfil` es la primera acción, antes de cualquier heading. Luego: `ESTANCIA` (Inicio, Mis servicios), `BENEFICIOS` (Rewards, Promociones), `SERVICIOS` (Servicios, Valet) y `HOTEL` (Hotel).
2. **Confirmación dirty:** aparece sobre Profile con backdrop transparente o ligeramente atenuado; Profile permanece visible detrás. No se usa fondo negro u opaco. `Continuar editando` conserva exactamente el borrador; `Descartar cambios` vuelve a `/account` sin guardar.

La ruta sigue siendo `/account/profile`, el owner sigue siendo Account y no se crea una quinta tab.

### Otras capacidades

Los contratos de Rewards, Promotions y Chat no cambian su comportamiento actual. Esta matriz guía una futura invalidación/refetch; no agrega stores, contexto global, persistencia ni una mutación a esas features.

## Backlog y límites

Los IDs aprobados son `IMP-AND-0501` (foundation), `0502` (Guest Login), `0503` (Linked Reservations + Active Context) y `0504` (QA journey). Su secuencia es `0501 → 0502 → 0503 → 0504 → IMP-AND-0116 → Android Release`. `0501` implementa exclusivamente la foundation definida en `33_GUEST_AUTH_FOUNDATION_IMPLEMENTATION_CONTRACT.md`; no adelanta las rutas ni la UI de tareas posteriores.

No incluir en una implementación derivada de este documento:

- auth real, tokens, refresh, cookies o password storage;
- Backend, HTTP real, IDs o estados Backend inventados;
- AsyncStorage, SecureStore, biometría o persistencia;
- rutas nuevas por intuición;
- reasignación de Promotions o Chat sin contrato;
- cambios de código productivo en esta rama documental.
