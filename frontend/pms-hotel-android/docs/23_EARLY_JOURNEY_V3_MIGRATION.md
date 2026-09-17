# 23 — Change Control: Android Early Journey → V3

**Tarea:** `IMP-AND-0107`
**Estado:** `COMPLETADA`
**Owner:** `ANDROID-1`
**Reviewer:** `WEB-3`; consultar `WEB-2` para la semántica futura de Cuenta.
**Fuentes:** `31:132 — Reference — Android Early Journey` y `238:132 — Implementation Ready — Android V2 + V3` como referencias históricas; la shell vigente se documenta en `04_NAVIGATION.md`.

## Problema detectado

Durante `IMP-AND-0106` se detectaron dos bloqueos:

1. `QA-AND-0106-01`: `MOB-02` conserva la footbar histórica `Inicio · Solicitudes · Explorar · Hotel`, mientras las features Guest vigentes usan `Servicios · Chat · Valet · Cuenta`. La estancia queda aislada de la navegación V3.
2. `QA-AND-0106-02`: las capacidades históricas `MOB-01` y `MOB-03..07` no tenían una migración explícita a la arquitectura V3.

Los frames `31:*` se preservan como referencia histórica. No se modifican ni se reutilizan como autoridad visual global.

## Cierre documental aprobado

Los gates de cierre de `IMP-AND-0107` obtuvieron:

- `ANDROID-1 PASS`;
- `WEB-3 PASS`;
- `WEB-2 CONSULT PASS`.

El freeze Early Journey → V3 queda aprobado. La evidencia final está registrada en el backlog canónico.

## Reejecución QA global — IMP-AND-0106

La reejecución global de Sprint 1 Android cerró con **PASS** tras completarse las migraciones y su validación automatizada, manual y de WEB-3.

- `QA-AND-0106-01`: **RESUELTO**. La única shell productiva Guest usa Inicio · Servicios · Valet · Hotel; `/account` es la representación vigente de Inicio y no existe una footbar V1 separada.
- `QA-AND-0106-02`: **RESUELTO**. `IMP-AND-0107` y `IMP-AND-0108..0114` están COMPLETADAS, con la matriz de rutas V3 de este documento implementada.

`IMP-AND-0106` queda **COMPLETADA** con Android Global DoD PASS, QA técnica PASS, QA manual PASS y WEB-3 PASS.

## Decisiones congeladas

- La shell Guest vigente es `Inicio · Servicios · Valet · Hotel`; Chat es una acción flotante fuera de la footbar y el drawer contiene Inicio, Mis servicios, Servicios, Valet y Hotel.
- No se crea una quinta tab `Estadía` y no se restituye la navegación V1.
- `MOB-19 — Acceso / Vincular reserva` vive en `/access`, fuera de `GuestNavigationShell`. Tras una vinculación exitosa, el flujo es `/access` → `/account` → **Account / Stay Hub V3**. El shell comienza cuando el huésped entra al contexto Guest vinculado.
- `IMP-AND-0108` usa exclusivamente código de reserva y correo electrónico. El target de raíz aprobado es `/` → `/access`; la vinculación mock exitosa redirige inmediatamente con `router.replace('/account')`, sin pantalla de success ni persistencia.
- `MOB-20 — Cuenta / Mi estadía` vive técnicamente en `/account`. Su representación visible y tab activa es Inicio para `/account` y sus rutas hijas. El contenido actual de Stay será la base del **Account / Stay Hub**.
- Las rutas `/services/*` mantienen Servicios activa y Back desde una ruta hija vuelve a `/services`. Las rutas `/account/*` mantienen Cuenta activa y Back desde una ruta hija vuelve a `/account`.
- `IMP-AND-0201` extenderá el Account / Stay Hub creado por `IMP-AND-0109`; no crea otro hub ni duplica `/account`.

## Matriz de migración

| Histórico, solo referencia | Migración V3 | Ruta | Tab activa | Tarea |
| --- | --- | --- | --- | --- |
| `MOB-01` (`31:133`) | `MOB-19 — Acceso / Vincular reserva` | `/access` | Ninguna; fuera del shell | `IMP-AND-0108` |
| `MOB-02` (`31:154`) | `MOB-20 — Inicio / Mi estadía` | `/account` | Inicio | `IMP-AND-0109` |
| `MOB-03` (`31:191`) | `MOB-21 — Servicios / Limpieza` | `/services/housekeeping` | Servicios | `IMP-AND-0110` |
| `MOB-04` (`31:221`) | `MOB-22 — Servicios / Room Service` | `/services/room-service` | Servicios | `IMP-AND-0111` |
| `MOB-05` (`31:264`) | `MOB-23 — Servicios / Mis solicitudes` | `/services/requests` | Servicios | `IMP-AND-0112` |
| `MOB-06` (`31:299`) | `MOB-24 — Servicios / Amenidades` | `/services/amenities` | Servicios | `IMP-AND-0113` |
| `MOB-07` (`31:338`) | `MOB-25 — Hotel` | `/hotel` | Hotel | `IMP-AND-0114` |

Los identificadores de Figma de esta matriz son únicamente trazabilidad; nunca son identificadores runtime. La referencia histórica no contiene el cambio a Hotel independiente, Chat flotante y drawer: esa migración es una decisión frontend-first de IMP-AND-0114.

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
- `IMP-AND-0110..0114` están COMPLETADAS. La reejecución de IMP-AND-0106 confirmó esta migración sin introducir alcance Backend, persistencia ni navegación V1 productiva.

## Gates cerrados de `IMP-AND-0107`

1. Revisión documental ANDROID-1 PASS, WEB-3 PASS y consulta WEB-2 PASS.
2. Al cierre histórico de IMP-AND-0107, el backlog mantenía `IMP-AND-0106` en `EN_PROGRESO` para reejecutar QA tras las migraciones; `IMP-AND-0201` depende de `IMP-AND-0109`.
3. `IMP-AND-0109` precede a `IMP-AND-0108`: Access necesita `/account` como destino post-success real y validable.
4. Las rutas, parent-tab semantics, ownership, dependencias y exclusiones de la matriz permanecen sin ambigüedad.
5. No se introdujeron cambios productivos de Android ni diseño Backend anticipado en este Change Control.

La reejecución de QA transversal confirmó ambos hallazgos como RESUELTOS y cerró `IMP-AND-0106` como COMPLETADA.
