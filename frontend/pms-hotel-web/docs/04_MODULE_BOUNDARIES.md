# 04 — Module Boundaries

## Propósito

Definir de forma explícita y obligatoria los límites de dependencias e imports dentro de `frontend/pms-hotel-web`.

Este documento gobierna `IMP-WEB-0011 — Configurar ESLint flat + boundaries`.

Debe leerse junto con:

- `03_FRONTEND_ARCHITECTURE.md`
- `04_LAYERED_DATA_FLOW.md`
- `05_MODULE_CATALOG.md`
- `AGENTS.md` global
- `frontend/pms-hotel-web/AGENTS.md`

En caso de conflicto aplica la jerarquía definida en `docs/01_SOURCE_OF_TRUTH.md`.

---

# 1. Dirección de dependencias permitida

La dirección conceptual es:

```text
app
 ↓
modules
 ↓
shared / lib
```

Interpretación:

- `app` puede importar APIs públicas de `modules`, además de `shared` y `lib`.
- `modules` puede importar `shared` y `lib`.
- `shared` puede importar únicamente otros elementos de `shared` y `lib`, si no genera ciclos.
- `lib` debe permanecer técnico y no depender de `modules`.
- `data/mocks` puede depender de DTOs/contratos públicos necesarios para simular red, pero no debe ser importado directamente por UI.

---

# 2. Dependencias prohibidas

## MUST NOT

```text
shared -> modules
lib -> modules
```

También está prohibido:

```text
module A -> internals de module B
```

Ejemplo incorrecto:

```ts
import { getReservation } from "@/modules/reservations/service/reservation.service";
```

Ejemplo correcto:

```ts
import { getReservation } from "@/modules/reservations";
```

La comunicación entre módulos debe pasar por la API pública del módulo, expuesta mediante su `index.ts`.

---

# 3. API pública de un módulo

Cuando exista un módulo de negocio, su forma esperada será:

```text
src/modules/<domain>/
├── dtos/
├── mappers/
├── model/
├── service/
├── hooks/
├── components/
└── index.ts
```

No todas las carpetas deben existir desde el primer commit.

Solo se crean cuando una tarea READY realmente las necesita.

`index.ts` es la frontera pública.

Puede exportar, cuando corresponda:

- Domain Models;
- hooks públicos;
- componentes de feature reutilizables fuera del módulo;
- funciones públicas intencionales.

No debe exportar automáticamente todos los internals.

---

# 4. Imports dentro del mismo módulo

Dentro de un módulo se permiten imports internos.

Ejemplo:

```ts
// src/modules/reservations/hooks/use-reservation.ts

import { mapReservation } from "../mappers/reservation.mapper";
import { getReservation } from "../service/reservation.service";
```

No es necesario pasar por `index.ts` para imports internos del mismo módulo.

Esto evita ciclos innecesarios.

---

# 5. Imports entre módulos

Si `booking` necesita una capacidad pública de `availability`:

Correcto:

```ts
import { useAvailability } from "@/modules/availability";
```

Incorrecto:

```ts
import { useAvailability } from "@/modules/availability/hooks/use-availability";
```

Incorrecto:

```ts
import { getAvailability } from "@/modules/availability/service/availability.service";
```

Incorrecto:

```ts
import type { AvailabilityDTO } from "@/modules/availability/dtos/availability.dto";
```

Un módulo consumidor no debe conocer el DTO interno de otro módulo.

---

# 6. DTO boundaries

Los DTOs pertenecen a la frontera de red del dominio que los define.

## Regla

La UI no consume DTO.

Otro módulo tampoco debe depender del DTO interno para construir su lógica.

Flujo permitido:

```text
Service
 ↓
DTO
 ↓
Mapper
 ↓
Domain
 ↓
Hook / State
 ↓
UI
```

Si un contrato debe compartirse entre módulos, se expone una abstracción Domain o una API pública deliberada.

No se resuelve compartiendo el DTO crudo por conveniencia.

---

# 7. `shared`

`src/shared` contiene elementos realmente genéricos y reutilizables.

Candidatos válidos cuando exista uso real:

- Button
- Input
- Modal
- ConfirmDialog
- DataTable
- StatusBadge
- EmptyState
- LoadingState
- ErrorState
- PageContainer

## MUST NOT

No mover a `shared`:

- reglas de Reservation;
- cálculos de Payment;
- lógica de Availability;
- copy específico de Housekeeping;
- lógica de Group;
- DTOs de negocio.

No crear componentes shared especulativos antes de su primera tarea del backlog.

---

# 8. `lib`

`src/lib` es infraestructura técnica transversal.

Ejemplos válidos:

```text
lib/http
lib/env
lib/errors
```

## MUST NOT

`lib` no contiene:

- Reservation rules;
- Payment rules;
- availability math;
- role-specific UI;
- feature hooks.

Si una pieza entiende demasiado del lenguaje del negocio, probablemente pertenece a un módulo.

---

# 9. `app`

Los archivos dentro de `src/app` son composición y routing.

`page.tsx` y `layout.tsx` deben mantenerse delgados.

Ejemplo correcto:

```tsx
import { ReservationCenterPage } from "@/modules/reservations";

export default function Page() {
  return <ReservationCenterPage />;
}
```

## MUST NOT

Un `page.tsx` no debe:

- hacer `fetch`;
- consumir DTO;
- ejecutar mapping;
- contener lógica extensa de negocio;
- duplicar un service;
- importar internals de un módulo.

---

# 10. `data/mocks`

MSW es la estrategia oficial Web.

El flujo debe conservar:

```text
UI
 ↓
Hook
 ↓
Service
 ↓
fetch
 ↓
MSW
 ↓
DTO
 ↓
Mapper
 ↓
Domain
```

## MUST NOT

Un componente no puede hacer:

```ts
import { fakeReservations } from "@/data/mocks";
```

`data/mocks` es infraestructura de simulación de red, no una segunda capa de datos para UI.

---

# 11. Dependencias circulares

Las dependencias circulares están prohibidas.

Ejemplo inválido:

```text
reservations -> folio -> reservations
```

Si dos módulos requieren información mutua:

1. revisar cuál es el owner real de la operación;
2. exponer una API pública mínima;
3. mover una abstracción verdaderamente compartida a un nivel inferior solo si corresponde;
4. si afecta arquitectura o semántica cross-domain, registrar la decisión antes de implementar.

No resolver ciclos usando imports dinámicos o paths internos como atajo.

---

# 12. Ownership y cambios cross-domain

El ownership oficial está en:

- `docs/06_TEAM_STRUCTURE.md`
- `27_TEAM_OWNERSHIP.md`
- Backlog de Implementación

Si un integrante necesita modificar internals de un módulo de otro owner:

1. no debe hacerlo unilateralmente;
2. debe coordinar con el owner;
3. la tarea necesita reviewer del owner afectado;
4. cualquier API cross-module nueva debe exponerse deliberadamente desde `index.ts`.

Ownership reduce conflictos; no crea silos.

---

# 13. Reglas de ESLint para IMP-WEB-0011

La configuración debe impedir, como mínimo:

## Prohibir

```text
src/shared/** -> src/modules/**
src/lib/** -> src/modules/**
src/modules/A/** -> src/modules/B/**/*
```

excepto:

```text
src/modules/A/** -> src/modules/B/index.ts
```

o el equivalente resuelto por alias como:

```ts
@/modules/B
```

También debe bloquear deep imports como:

```ts
@/modules/B/service/*
@/modules/B/dtos/*
@/modules/B/mappers/*
@/modules/B/model/*
@/modules/B/hooks/*
@/modules/B/components/*
```

cuando el import viene desde otro módulo.

---

# 14. Excepciones

Una excepción de boundaries no puede agregarse solo para hacer pasar ESLint.

Toda excepción debe tener:

- motivo;
- alcance;
- owner;
- reviewer;
- decisión registrada cuando sea arquitectónica;
- fecha o condición para eliminarla si es temporal.

No usar reglas globales como:

```text
eslint-disable
```

para esconder un problema estructural.

---

# 15. Prueba obligatoria de IMP-WEB-0011

La tarea no está DONE solo porque `npm run lint` pase.

Durante implementación debe comprobarse que la regla detecta una violación real.

Ejemplo de prueba temporal:

```text
shared -> modules
```

Debe fallar lint.

Luego eliminar el archivo/import temporal.

Después:

```bash
npm run lint
```

debe finalizar PASS en el árbol real.

La evidencia de la tarea debe registrar:

```text
Boundary violation test: FAIL as expected
Final repository lint: PASS
```

---

# 16. Casos de referencia

## Caso A — Booking consume Availability

Permitido:

```text
booking -> availability public API
```

Reviewer:
`WEB-4`

No permitido:

```text
booking -> availability/service/*
```

---

## Caso B — Reservation Detail muestra Folio summary

Permitido:

```text
reservations -> folio public API
```

No permitido:

```text
reservations -> folio/dtos/*
```

Reviewer:
`WEB-4`

---

## Caso C — Multi-property consume Revenue metrics

Permitido:

```text
properties -> revenue public API
```

No permitido:

```text
properties -> revenue/mappers/*
```

Reviewer:
`WEB-4`

---

## Caso D — Shared DataTable

Permitido:

```text
reservations -> shared/DataTable
folio -> shared/DataTable
```

Prohibido:

```text
shared/DataTable -> reservations
```

`DataTable` recibe configuración/datos ya preparados; no conoce ReservationDTO.

---

# 17. Definition of Ready — boundary change

Una tarea que modifica boundaries está READY solo si:

- owner definido;
- módulos afectados identificados;
- motivo documentado;
- API pública requerida definida;
- reviewer del otro dominio asignado;
- no existe una alternativa válida con las reglas actuales.

---

# 18. Definition of Done — boundary change

PASS solo si:

- `npm run lint` PASS;
- `npm run typecheck` PASS;
- no dependencia circular;
- no deep imports cross-module;
- `shared` y `lib` no dependen de `modules`;
- API pública del módulo queda explícita;
- reviewer afectado aprueba;
- documentación se actualiza si cambió la arquitectura.

---

# 19. Regla de Sprint 0

Durante Sprint 0 no deben existir módulos de negocio con capas o lógica funcional.

El Structure Freeze autorizado permite module shells con solo `README.md` e `index.ts` para ownership. No son módulos funcionales, no exponen APIs todavía y no autorizan carpetas internas.

Por tanto, `IMP-WEB-0011` debe:

1. dejar preparada la configuración de boundaries;
2. validar al menos una violación temporal;
3. eliminar esa violación antes de terminar;
4. no crear módulos de negocio adicionales únicamente para probar ESLint.

---

# 20. Regla final

Ante una necesidad futura que contradiga este documento:

```text
STOP
 ↓
documentar necesidad
 ↓
owner + reviewer
 ↓
decisión arquitectónica si aplica
 ↓
actualizar documentación
 ↓
implementar
```

Nunca se modifica una regla de boundaries de forma silenciosa para desbloquear una feature.
