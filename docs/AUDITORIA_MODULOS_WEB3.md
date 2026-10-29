# Auditoría de Módulos WEB-3 — Frontend PMS Hotel Boutique

**Fecha:** 2026-09-22
**Rama auditada:** web3 (post-merge de main)
**Auditor:** WEB-4
**Alcance:** Módulos asignados a WEB-3 según `27_TEAM_OWNERSHIP.md`

---

## 1. Resumen Ejecutivo

| Módulo | Estado | HIGH | MEDIUM | LOW |
|--------|--------|------|--------|-----|
| reservations | Cumple | 0 | 0 | 0 |
| stays | Cumple | 0 | 0 | 0 |
| rooms | Cumple | 0 | 0 | 2 |
| housekeeping | Cumple | 0 | 0 | 2 |
| maintenance | Cumple | 0 | 0 | 1 |
| concierge | Cumple | 0 | 0 | 2 |
| parking-valet | Cumple | 0 | 0 | 2 |
| messaging | Cumple | 0 | 0 | 2 |
| companies | Cumple | 0 | 0 | 1 |
| agencies | Cumple | 0 | 0 | 2 |
| groups | Cumple | 0 | 0 | 0 |
| integrations | Cumple | 0 | 0 | 0 |
| reports | Cumple | 0 | 0 | 1 |

**Total:** 0 violaciones HIGH, 0 violaciones MEDIUM, 15 hallazgos LOW/INFO

---

## 2. Criterios de Evaluación

Se evaluó cada módulo contra las reglas documentadas en:

- `docs/04_MODULE_BOUNDARIES.md`
- `docs/04_LAYERED_DATA_FLOW.md`
- `docs/06_DTO_RULES.md`
- `docs/07_MAPPER_RULES.md`
- `docs/08_DOMAIN_MODEL_RULES.md`
- `docs/09_SERVICE_RULES.md`
- `docs/10_HOOK_AND_STATE_RULES.md`
- `frontend/pms-hotel-web/AGENTS.md`

Criterios:

1. Estructura de carpetas (dtos/mappers/model/service/hooks/components)
2. `index.ts` exporta solo API pública (domain models + components)
3. Services usan `httpRequest` y retornan DTOs
4. Mappers son funciones puras (DTO -> Domain) con `DomainMappingError`
5. Domain models usan lenguaje de negocio (camelCase)
6. No hay violaciones de boundaries entre módulos
7. Hooks orquestan service -> mapper -> domain
8. Tests presentes en todas las capas

---

## 3. Módulos con Cumplimiento Total

### 3.1 reservations

**Veredicto:** Ejemplar — el módulo más completo del proyecto

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | dtos/mappers/model/service/hooks/components |
| index.ts | PASS | Exporta solo componentes y domain types |
| Services (2) | PASS | `httpRequest`, retornan DTOs |
| Mappers (5) | PASS | Puros, lanzan `DomainMappingError` |
| Domain Models (5) | PASS | CamelCase, amounts como number, dates como Date |
| Hooks (5) | PASS | Orquestan service -> mapper -> domain |
| Components (6) | PASS | Consumen domain models via hooks |
| Tests (20 archivos) | PASS | Cobertura completa en todas las capas |
| Boundaries | PASS | Solo importa `@/modules/stays` (autorizado) |

**Destacados:**
- Usa utilidades compartidas de `@/lib/mapper` (`requiredText`, `parseAmount`, `parseDay`)
- Invalidación de queries en mutaciones exitosas
- Manejo de `HttpNetworkError` en componentes

---

### 3.2 stays

**Veredicto:** Ejemplar — implementación de referencia

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componentes y domain types |
| Services (2) | PASS | `httpRequest`, DTOs |
| Mappers (2) | PASS | Puros, `DomainMappingError` |
| Domain Models (2) | PASS | CamelCase, types correctos |
| Hooks (2) | PASS | Service -> mapper -> domain |
| Components (2) | PASS | Presentacionales |
| Tests (~47 casos) | PASS | Cobertura excelente |
| Boundaries | PASS | Sin imports cross-module |

---

### 3.3 rooms

**Veredicto:** Cumple

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componente y domain types |
| Service | PASS | `httpRequest`, retorna `RoomListDto` |
| Mapper | PASS | Puro, `DomainMappingError` |
| Domain Model | PASS | `RoomStatus` como union type, type guard |
| Hook | PASS | TanStack Query, orquesta service -> mapper |
| Components (2) | PASS | Presentacionales |
| Tests (23) | PASS | Todos pasan |

**Hallazgos LOW:**

| # | Hallazgo |
|---|----------|
| R-1 | Falta test directo para `isRoomStatus` type guard |
| R-2 | `property_id` no tiene test de rechazo en mapper |

---

### 3.4 housekeeping

**Veredicto:** Cumple

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componente y domain types |
| Service | PASS | `httpRequest`, `RoomCleaningListDto` |
| Mapper | PASS | Puro, `DomainMappingError` |
| Domain Model | PASS | `isRoomCleaningStatus` guard |
| Hook | PASS | Orquesta service -> mapper |
| Components (2) | PASS | Presentacionales |
| Tests (13) | PASS | Cobertura adecuada |

**Hallazgos LOW:**

| # | Hallazgo |
|---|----------|
| H-1 | Falta test directo para `isRoomCleaningStatus` guard |
| H-2 | `STATUS_LABELS` duplicado en `housekeeping-board.tsx` y `room-cleaning-detail.tsx` |

---

### 3.5 maintenance

**Veredicto:** Cumple

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componente y domain types |
| Service | PASS | `httpRequest`, `MaintenanceOrderListDto` |
| Mapper | PASS | Puro, `DomainMappingError` con 3 códigos de error |
| Domain Model | PASS | `ReadonlyArray` para historial, `resolveMaintenanceOrder` pura |
| Hook | PASS | Orquesta service -> mapper |
| Components (2) | PASS | Presentacionales |
| Tests (21) | PASS | Incluye test de model con lógica de negocio |

**Destacados:**
- Función pura `resolveMaintenanceOrder` en el domain model
- `ReadonlyArray<MaintenanceOrderEvent>` para audit trail append-only

**Hallazgos LOW:**

| # | Hallazgo |
|---|----------|
| M-1 | `maintenance-center.tsx` renderiza status como texto raw en vez de usar label traducido |

---

### 3.6 concierge

**Veredicto:** Cumple

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componente y domain types |
| Service | PASS | `httpRequest`, `ConciergeTaskListDto` |
| Mapper | PASS | Puro, `DomainMappingError` |
| Domain Model | PASS | CamelCase, `ConciergeTaskStatus` typed |
| Hook | PASS | Orquesta service -> mapper |
| Components (2) | PASS | Presentacionales |
| Tests | PASS | Cobertura completa |

**Hallazgos LOW:**

| # | Hallazgo |
|---|----------|
| C-1 | README aún tiene lenguaje de Structure Freeze |
| C-2 | Sufijo `Dto` en vez de `DTO` (consistente con codebase) |

---

### 3.7 parking-valet

**Veredicto:** Cumple

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componente y domain types |
| Service | PASS | `httpRequest`, `ValetRequestListDto` |
| Mapper | PASS | Puro, `DomainMappingError` con 7 casos de test |
| Domain Model | PASS | `ValetRequestStatus`, `ValetRequestRequestType` typed |
| Hook | PASS | Orquesta service -> mapper |
| Components (2) | PASS | Presentacionales |
| Tests | PASS | Mapper más exhaustivo (7 casos) |

**Hallazgos LOW:**

| # | Hallazgo |
|---|----------|
| P-1 | `STATUS_LABELS` y `REQUEST_TYPE_LABELS` duplicados entre center y detail |
| P-2 | README desactualizado |

---

### 3.8 messaging

**Veredicto:** Cumple

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componente y domain types |
| Service | PASS | `httpRequest`, `OperationalMessageListDto` |
| Mapper | PASS | Puro, `DomainMappingError` con 8 casos de test |
| Domain Model | PASS | `createdAt: Date` (convertido desde string en mapper) |
| Hook | PASS | Orquesta service -> mapper |
| Components (2) | PASS | Presentacionales |
| Tests | PASS | Mapper más robusto (validación de datetime) |

**Destacados:**
- Mapper maneja conversión `created_at: string` -> `createdAt: Date` con validación ISO 8601

**Hallazgos LOW:**

| # | Hallazgo |
|---|----------|
| MS-1 | `STATUS_LABELS` y `SENDER_LABELS` duplicados entre center y detail |
| MS-2 | README desactualizado |

---

### 3.9 companies

**Veredicto:** Cumple

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componente y domain type |
| Service | PASS | `httpRequest`, `CompanyListDto` |
| Mapper | PASS | Puro, `DomainMappingError` |
| Domain Model | PASS | CamelCase |
| Hook | PASS | Orquesta service -> mapper |
| Components (2) | PASS | Presentacionales |
| Tests | PASS | Cobertura completa |

**Hallazgos LOW:**

| # | Hallazgo |
|---|----------|
| CO-1 | `statusCode: string` en vez de `status: CompanyStatus` (typed union) — comparar con groups |

---

### 3.10 agencies

**Veredicto:** Cumple

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componente y domain type |
| Service | PASS | `httpRequest`, `AgencyListDto` |
| Mapper | PASS | Puro, `DomainMappingError` |
| Domain Model | PASS | CamelCase |
| Hook | PASS | Orquesta service -> mapper |
| Components (2) | PASS | Presentacionales |
| Tests | PASS | Cobertura adecuada |

**Hallazgos LOW:**

| # | Hallazgo |
|---|----------|
| AG-1 | `statusCode: string` en vez de `status: AgencyStatus` (typed union) |
| AG-2 | `agency-detail.test.tsx` tiene solo 1 caso de test (menos que company-detail) |

---

### 3.11 groups

**Veredicto:** Ejemplar — el mejor domain model del proyecto

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa + `group-lifecycle.ts` |
| index.ts | PASS | Exporta componente, domain types y `GroupLifecycleStatus` |
| Service | PASS | `httpRequest`, `GroupListDto` |
| Mapper | PASS | Puro, `DomainMappingError` con validación de enum |
| Domain Model | PASS | `status: GroupLifecycleStatus` (typed union), lifecycle logic |
| Hook | PASS | Orquesta service -> mapper |
| Components (2) | PASS | Presentacionales |
| Tests | PASS | Más exhaustivos (incluye lifecycle state machine) |

**Destacados:**
- `GROUP_LIFECYCLE` como `const` array con derived union type
- `canTransitionGroup()` y `nextGroupStatus()` encapsulan reglas de negocio
- Lifecycle estrictamente documentado: INQUIRY -> TENTATIVE -> DEFINITE -> IN_HOUSE -> CLOSED
- Modelo de referencia para companies y agencies

---

### 3.12 integrations

**Veredicto:** Cumple

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componente y domain types |
| Service | PASS | `httpRequest`, `IntegrationListDto` |
| Mapper | PASS | Puro, `DomainMappingError` |
| Domain Model | PASS | `IntegrationCategory`, `IntegrationHealth` typed, `summarizeIntegrations` pura |
| Hook | PASS | Orquesta service -> mapper |
| Component (1) | PASS | Presentacional |
| Tests | PASS | Incluye test de model |

---

### 3.13 reports

**Veredicto:** Cumple

| Capa | Estado | Detalle |
|------|--------|---------|
| Estructura | PASS | Completa |
| index.ts | PASS | Solo componente y domain types |
| Service | PASS | `httpRequest`, `PropertyReportListDto` |
| Mapper | PASS | Puro, `DomainMappingError` |
| Domain Model | PASS | `readonly` props, `summarizeReports` pura |
| Hook | PASS | Orquesta service -> mapper |
| Component (1) | PASS | Presentacional |
| Tests | PASS | Cobertura completa |

**Hallazgos LOW:**

| # | Hallazgo |
|---|----------|
| RP-1 | Falta test para `summarizeReports` (función pura con lógica de agregación) |

---

## 4. Hallazgos Transversales

### 4.1 Sufijo DTO

La documentación (`06_DTO_RULES.md`) especifica sufijo `DTO` (all-caps). Todos los módulos WEB-3 usan `Dto` (camelCase). Sin embargo, esto es **consistente con el 90% del codebase** (88 de 97 DTOs usan `Dto`). Es una inconsistencia global, no de WEB-3.

### 4.2 READMEs desactualizados

Varios módulos (concierge, parking-valet, messaging) aún tienen lenguaje de Structure Freeze en sus READMEs a pesar de estar completamente implementados.

### 4.3 Labels duplicados

`STATUS_LABELS` está definido idénticamente en componentes center y detail dentro de housekeeping, parking-valet y messaging. Debería extraerse a un shared location dentro del módulo.

### 4.4 companies y agencies — `statusCode`

Ambos módulos usan `statusCode: string` en vez de `status: TypedUnion` como hace groups. Esto es un gap de calidad del domain model pero no viola las reglas (el campo es camelCase). Se recomienda alinear con el patrón de groups cuando lleguen las tareas READY.

---

## 5. Comparación con WEB-4

| Criterio | WEB-3 | WEB-4 |
|----------|-------|-------|
| Módulos auditados | 13 | 7 (4 implementados + 5 vacíos) |
| Services usan `httpRequest` | 13/13 (100%) | 4/7 (57%) |
| Services retornan DTOs | 13/13 (100%) | 4/7 (57%) |
| Services no mapean internamente | 13/13 (100%) | 4/7 (57%) |
| Hooks existentes | 13/13 (100%) | 0/7 (0%) |
| Violaciones HIGH | 0 | 10 |
| Violaciones MEDIUM | 0 | 9 |

**WEB-3 está significativamente mejor implementado que WEB-4.** Las diferencias principales:

1. **Services:** Todos los de WEB-3 usan `httpRequest` y retornan DTOs. 3 de WEB-4 usan `fetch()` directo y retornan domain models.

2. **Hooks:** Todos los módulos WEB-3 tienen hooks que orquestan service -> mapper -> domain. Ningún módulo WEB-4 tiene hooks.

3. **Tests:** WEB-3 tiene tests en todas las capas incluyendo hooks. WEB-4 tiene tests en services y mappers pero no en hooks (porque no existen).

---

## 6. Módulos de Referencia

Para futuras implementaciones o correcciones, estos módulos sirven como referencia:

| Criterio | Módulo de referencia |
|----------|---------------------|
| Arquitectura completa | reservations, stays |
| Domain model con lógica de negocio | groups (lifecycle state machine) |
| Mapper con validación exhaustiva | messaging (8 casos, datetime validation) |
| Tests | reservations (20 archivos), stays (~47 casos) |
| Domain model inmutable | maintenance (`ReadonlyArray`) |

---

*Documento generado por auditoría automática — 2026-09-22*
