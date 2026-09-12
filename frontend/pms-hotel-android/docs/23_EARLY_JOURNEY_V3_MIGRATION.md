# 23 — Change Control: Android Early Journey → V3

**Tarea:** `IMP-AND-0107`
**Estado:** `EN_QA`
**Owner:** `ANDROID-1`
**Reviewer:** `WEB-3`; consultar `WEB-2` para la semántica futura de Cuenta.
**Fuentes:** `31:132 — Reference — Android Early Journey` (histórica) y `238:132 — Implementation Ready — Android V2 + V3` (vigente).

## Problema detectado

Durante `IMP-AND-0106` se detectaron dos bloqueos:

1. `QA-AND-0106-01`: `MOB-02` conserva la footbar histórica `Inicio · Solicitudes · Explorar · Hotel`, mientras las features Guest vigentes usan `Servicios · Chat · Valet · Cuenta`. La estancia queda aislada de la navegación V3.
2. `QA-AND-0106-02`: las capacidades históricas `MOB-01` y `MOB-03..07` no tenían una migración explícita a la arquitectura V3.

Los frames `31:*` se preservan como referencia histórica. No se modifican ni se reutilizan como autoridad visual global.

## Decisiones congeladas

- La navegación Guest V3 sigue siendo exclusivamente `Servicios · Chat · Valet · Cuenta`.
- No se crea una quinta tab `Estadía` y no se restituye la navegación V1.
- `MOB-19 — Acceso / Vincular reserva` vive en `/access`, fuera de `GuestNavigationShell`. Tras una vinculación exitosa, el flujo es `/access` → `/account` → **Account / Stay Hub V3**. El shell comienza cuando el huésped entra al contexto Guest vinculado.
- `MOB-20 — Cuenta / Mi estadía` vive en `/account`. Cuenta permanece activa para `/account` y todas sus rutas hijas. El contenido actual de Stay será la base del **Account / Stay Hub**.
- Las rutas `/services/*` mantienen Servicios activa y Back desde una ruta hija vuelve a `/services`. Las rutas `/account/*` mantienen Cuenta activa y Back desde una ruta hija vuelve a `/account`.
- `IMP-AND-0201` extenderá el Account / Stay Hub creado por `IMP-AND-0109`; no crea otro hub ni duplica `/account`.

## Matriz de migración

| Histórico, solo referencia | Migración V3 | Ruta | Tab activa | Tarea |
| --- | --- | --- | --- | --- |
| `MOB-01` (`31:133`) | `MOB-19 — Acceso / Vincular reserva` | `/access` | Ninguna; fuera del shell | `IMP-AND-0108` |
| `MOB-02` (`31:154`) | `MOB-20 — Cuenta / Mi estadía` | `/account` | Cuenta | `IMP-AND-0109` |
| `MOB-03` (`31:191`) | `MOB-21 — Servicios / Limpieza` | `/services/housekeeping` | Servicios | `IMP-AND-0110` |
| `MOB-04` (`31:221`) | `MOB-22 — Servicios / Room Service` | `/services/room-service` | Servicios | `IMP-AND-0111` |
| `MOB-05` (`31:264`) | `MOB-23 — Servicios / Mis solicitudes` | `/services/requests` | Servicios | `IMP-AND-0112` |
| `MOB-06` (`31:299`) | `MOB-24 — Servicios / Amenidades` | `/services/amenities` | Servicios | `IMP-AND-0113` |
| `MOB-07` (`31:338`) | `MOB-25 — Servicios / Información del hotel` | `/services/hotel-info` | Servicios | `IMP-AND-0114` |

Los identificadores de Figma de esta matriz son únicamente trazabilidad; nunca son identificadores runtime.

## Ownership y dependencias

| Tarea | Owner | Reviewer | Dependencias |
| --- | --- | --- | --- |
| `IMP-AND-0107` | ANDROID-1 | WEB-3 | Hallazgos QA-AND-0106-01/02 documentados |
| `IMP-AND-0108` | ANDROID-1 | WEB-3 | `IMP-AND-0107`, `IMP-AND-0109` |
| `IMP-AND-0109` | ANDROID-1 | WEB-2 | `IMP-AND-0107` |
| `IMP-AND-0110..0114` | ANDROID-1 | WEB-3 | `IMP-AND-0107`, `IMP-AND-0103` |
| `IMP-AND-0201` | ANDROID-1 | WEB-2 | `IMP-AND-0009`, `IMP-AND-0109` |

## Arquitectura frontend-first

Cada futura pantalla respeta la frontera existente:

```text
src/data/mocks/<module>
  ↓
mock boundary
  ↓
Fixture DTO
  ↓
Mapper puro
  ↓
Domain
  ↓
TanStack Query/Mutation
  ↓
UI
```

`RemoteState` continúa derivado de TanStack Query y no constituye un store paralelo. Cada tarea futura define su contrato frontend/mock y sus escenarios únicamente cuando alcance `READY`.

## Exclusiones

- No se implementan pantallas, rutas, DTOs, mappers, Domain, hooks, mocks funcionales ni tests en este Change Control.
- No se definen endpoints, HTTP real, autenticación real, Backend, persistencia, secretos, NetInfo, cola offline ni sincronización en segundo plano.
- No se modifica Figma ni se convierten los frames `31:*` en fuente vigente.
- No se inicia `IMP-AND-0108..0114`, Sprint 2 ni una feature de Cuenta.

## Gates para cerrar `IMP-AND-0107`

1. Revisión documental de ANDROID-1 y WEB-3 PASS; WEB-2 confirma la extensión de Cuenta cuando corresponda.
2. Backlog sincronizado: `IMP-AND-0106` vuelve a `EN_PROGRESO`, `IMP-AND-0107` queda `EN_QA`, `IMP-AND-0108..0114` quedan `PENDIENTE` y `IMP-AND-0201` depende de `IMP-AND-0109`.
3. `IMP-AND-0109` precede a `IMP-AND-0108`: Access necesita `/account` como destino post-success real y validable.
4. Las rutas, parent-tab semantics, ownership, dependencias y exclusiones de la matriz permanecen sin ambigüedad.
5. No existen cambios productivos de Android ni diseño Backend anticipado.

`IMP-AND-0106` solo puede volver a `EN_QA` cuando la migración deje de tener estos hallazgos bloqueantes y su QA transversal se ejecute de nuevo.
