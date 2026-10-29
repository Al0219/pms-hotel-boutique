# Auditoría de Módulos WEB-4 — Frontend PMS Hotel Boutique

**Rama auditada:** web4-sprint-4
**Auditor:** WEB-3
**Alcance:** Módulos asignados a WEB-4 según `27_TEAM_OWNERSHIP.md`

---

## 1. Resumen Ejecutivo

| Módulo    | Estado | HIGH | MEDIUM | LOW |
|--------   |--------|------|--------|-----|
| folio     | Cumple | 0 | 1 | 2 |
| payments  | Cumple | 0 | 0 | 2 |
| availability | Cumple | 0 | 1 | 1 |
| rates | No cumple | 4 | 2 | 1 |
| inventory | No cumple | 3 | 2 | 0 |
| revenue | No cumple | 3 | 3 | 2 |
| receivables | Placeholder | — | — | — |
| cash | Placeholder | — | — | — |
| channels | Placeholder | — | — | — |
| purchases | Placeholder | — | — | — |
| night-audit | Placeholder | — | — | — |

**Total:** 10 violaciones HIGH, 9 violaciones MEDIUM, 8 LOW/INFO

---

## 2. Criterios de Evaluación

Se evaluó cada módulo contra las reglas documentadas en:

- `docs/04_MODULE_BOUNDARIES.md`
- `docs/06_DTO_RULES.md`
- `docs/07_MAPPER_RULES.md`
- `docs/08_DOMAIN_MODEL_RULES.md`
- `docs/09_SERVICE_RULES.md`
- `frontend/pms-hotel-web/AGENTS.md`

Criterios:

1. Estructura de carpetas (dtos/mappers/model/service/hooks/components)
2. `index.ts` exporta solo API pública
3. Services usan `httpRequest` y retornan DTOs
4. Mappers son funciones puras (DTO -> Domain)
5. Domain models usan lenguaje de negocio
6. No hay violaciones de boundaries entre módulos
7. Types correctos
8. Tests presentes

---

## 3. Módulos con Cumplimiento Adecuado

### 3.1 folio

**Veredicto:** Casi perfecto

| Capa | Estado | Detalle |
|------|--------|---------|
| Service | PASS | Usa `httpRequest`, retorna DTOs |
| Mappers | PASS | Puros, lanzan `DomainMappingError` |
| Domain Model | PASS | CamelCase, sin API field names |
| Tests | PASS | Servicio + mappers + 1 componente |
| Boundaries | PASS | Sin imports cross-module problemáticos |

**Hallazgos:**

| # | Severidad | Hallazgo | Ubicación |
|---|-----------|----------|-----------|
| F-1 | MEDIUM | `src/data/mocks/handlers.ts` hace deep import a `@/modules/folio/dtos/folio.dto` en vez de usar el barrel | `src/data/mocks/handlers.ts:10` |
| F-2 | LOW | `createChargeRoutingRuleDto` no tiene tests | `service/folio.service.ts` |
| F-3 | LOW | `FolioSplitModal` y `FolioTransferModal` no tienen tests de componente | `components/` |

---

### 3.2 payments

**Veredicto:** El mejor implementado del proyecto

| Capa | Estado | Detalle |
|------|--------|---------|
| Service | PASS | Usa `httpRequest`, retorna DTOs |
| Mappers | PASS | Ejemplares, validan todo, DomainMappingError |
| Domain Model | PASS | Limpio, sin PAN/CVV |
| Tests | PASS | 18 archivos cubren todo |
| Boundaries | PASS | Sin violaciones |
| Seguridad | PASS | Cero PAN/CVV verificado en tests |

**Hallazgos:**

| # | Severidad | Hallazgo | Ubicación |
|---|-----------|----------|-----------|
| P-1 | LOW | Falta directorio `hooks/` | Raíz del módulo |
| P-2 | LOW | `mapPaymentListFiltersToDto` no tiene test directo | `mappers/payment.mapper.ts` |

---

### 3.3 availability

**Veredicto:** Muy bueno, con gap en exports

| Capa | Estado | Detalle |
|------|--------|---------|
| Service | PASS | Usa `httpRequest`, retorna DTOs |
| Mappers | PASS | Puros |
| Domain Model | PASS | Documenta ATS vs inventario físico |
| Tests | PASS | Cobertura adecuada |

**Hallazgos:**

| # | Severidad | Hallazgo | Ubicación |
|---|-----------|----------|-----------|
| A-1 | MEDIUM | `index.ts` no exporta 4 DTO types: `AvailabilitySearchQueryDto`, `AvailabilityResponseDto`, `RatePlanOptionDto`, `AvailableRoomTypeDto` | `index.ts` |
| A-2 | LOW | `mapPropertyDailySummaryDtoToDomain` no tiene test directo | `mappers/availability-matrix.mapper.ts` |

**Consecuencia de A-1:** Consumidores externos (como mock handlers) se ven forzados a hacer deep imports a `@/modules/availability/dtos/availability.dto`.

---

## 4. Módulos con Violaciones Críticas

### 4.1 rates — Service rate-restriction

**Veredicto:** El sub-dominio `rate-plan` cumple. El sub-dominio `rate-restriction` viola 5 reglas.

| Capa | Estado | Detalle |
|------|--------|---------|
| rate-plan service | PASS | Usa `httpRequest`, retorna DTOs |
| rate-restriction service | **FAIL** | Usa `fetch()`, retorna domain models |
| Mappers rate-plan | PASS | Puros, validan con DomainMappingError |
| Mappers rate-restriction | PARTIAL | Puros pero NO validan (no lanzan DomainMappingError) |
| Domain Model | PASS | Lenguaje de negocio |
| Tests | PARTIAL | rate-plan service test llama API real sin mock |

**Violaciones del service rate-restriction (`rate-restriction.service.ts`):**

| # | Regla | Violación | Línea |
|---|-------|-----------|-------|
| R-1 | Service debe usar `httpRequest` | Usa `fetch()` directo | 26, 38 |
| R-2 | Service debe retornar DTOs | Retorna `RateRestriction[]` y `RateRestrictionBatchResult` (domain) | 17, 36 |
| R-3 | Service no debe mapear | Llama `toDomainRateRestriction()` y `toDomainRateRestrictionBatchResult()` | 31, 51 |
| R-4 | Service debe aceptar DTOs | Acepta `RateRestrictionFilter` (domain type) | 17 |
| R-5 | Naming con `Dto` suffix | Funciones se llaman `fetchRateRestrictions`, `batchUpdateRateRestrictions` | — |

**Hallazgos adicionales:**

| # | Severidad | Hallazgo | Ubicación |
|---|-----------|----------|-----------|
| R-6 | MEDIUM | `rate-restriction.mapper.ts` no lanza `DomainMappingError` — silencia datos inválidos | `mappers/rate-restriction.mapper.ts` |
| R-7 | MEDIUM | `rate-plan.service.test.ts` hace llamadas HTTP reales sin mock | `service/rate-plan.service.test.ts` |
| R-8 | LOW | `rate-restrictions-grid.tsx` tiene 699 líneas con lógica de negocio que debería estar en hooks | `components/rate-restrictions-grid.tsx` |

---

### 4.2 inventory

**Veredicto:** Service viola 3 reglas críticas

| Capa | Estado | Detalle |
|------|--------|---------|
| Service | **FAIL** | Usa `fetch()`, retorna domain models |
| Mappers | PASS | Puros, validan |
| Domain Model | PASS | Lenguaje de negocio, función pura `calculateSellableATS` |
| Tests | PASS | Cobertura adecuada |
| index.ts | **FAIL** | Exporta DTOs, mappers y services |

**Violaciones del service (`sell-limit.service.ts`):**

| # | Regla | Violación | Línea |
|---|-------|-----------|-------|
| I-1 | Service debe usar `httpRequest` | Usa `fetch()` directo | 27, 40 |
| I-2 | Service debe retornar DTOs | Retorna `SellLimit[]` y `SellLimit` (domain) | 33, 53 |
| I-3 | Service no debe mapear | Llama `toDomainSellLimitList()` y `toDomainSellLimit()` | 33, 53 |

**Hallazgos adicionales:**

| # | Severidad | Hallazgo | Ubicación |
|---|-----------|----------|-----------|
| I-4 | MEDIUM | `index.ts` exporta DTOs, mappers y services (leak de internos) | `index.ts` |
| I-5 | MEDIUM | Falta directorio `hooks/` | Raíz del módulo |

---

### 4.3 revenue

**Veredicto:** Service viola 3 reglas críticas + inconsistencias

| Capa | Estado | Detalle |
|------|--------|---------|
| Service | **FAIL** | Usa `fetch()`, retorna domain models |
| Mappers | PASS | Puros (pero trivial 1:1) |
| Domain Model | PASS | Lenguaje de negocio |
| index.ts | PASS | Correctamente restringido |
| Tests | PARTIAL | `KpiCards` y `KpiCharts` sin tests dedicados |

**Violaciones del service (`revenue-kpi.service.ts`):**

| # | Regla | Violación | Línea |
|---|-------|-----------|-------|
| V-1 | Service debe usar `httpRequest` | Usa `fetch()` directo | 11 |
| V-2 | Service debe retornar DTOs | Retorna `RevenueKpi` (domain) | 18 |
| V-3 | Service no debe mapear | Llama `mapRevenueKpiResponseToDomain()` | 18 |

**Hallazgos adicionales:**

| # | Severidad | Hallazgo | Ubicación |
|---|-----------|----------|-----------|
| V-4 | MEDIUM | DTOs usan `camelCase` en vez de `snake_case` (inconsistente con otros módulos) | `dtos/revenue-kpi.dto.ts` |
| V-5 | MEDIUM | `RevenueKpiFilters` está en `model/` pero debería ser request DTO en `dtos/` | `model/revenue-kpi.ts:31` |
| V-6 | MEDIUM | Falta directorio `hooks/` — componente maneja fetch internamente | Raíz del módulo |
| V-7 | LOW | Mapper es trivial 1:1 (campos idénticos entre DTO y domain) | `mappers/revenue-kpi.mapper.ts` |

---

## 5. Módulos Placeholder (Structure Freeze)

| Módulo | index.ts | README | Implementación | Ruta en app/ |
|--------|----------|--------|----------------|-------------|
| receivables | Sí (sin exports) | Sí | No | No |
| cash | Sí (sin exports) | Sí | No | No |
| channels | Sí (sin exports) | Sí | No | No |
| purchases | Sí (sin exports) | Sí | No | No |
| night-audit | Sí (sin exports) | Sí | No | No |

**Estado:** Correcto durante Structure Freeze. Los READMEs documentan la estructura futura esperada.

---

## 6. Hallazgos Transversales

### 6.1 Patrón problemático en 3 services

Los services de `inventory`, `revenue` y `rates/rate-restriction` comparten el mismo patrón incorrecto:

```
❌ Lo que hacen:
Service → fetch() → JSON → mapear a domain → retornar domain

✅ Lo que deberían hacer:
Service → httpRequest → retornar DTO
                          ↓
                    Hook/State → mapper → domain
```

El patrón correcto está demostrado en:
- `rates/rate-plan.service.ts`
- `payments/payment.service.ts`
- `folio/folio.service.ts`

### 6.2 Directorio `hooks/` ausente en todos los módulos

Ningún módulo WEB-4 tiene directorio `hooks/`. La arquitectura requiere:

```
Service → DTO → Mapper → Domain Model → Hook/State → UI
```

Sin hooks, la orquestación de llamadas a services, mapeo y estado queda fuera del módulo.

### 6.3 Deep imports desde mock handlers

`src/data/mocks/handlers.ts` importa directamente de:
- `@/modules/folio/dtos/folio.dto`
- `@/modules/availability/dtos/availability.dto`

Debería usar los barrels: `@/modules/folio` y `@/modules/availability`.

### 6.4 Import path de services

Algunos services importan de `@/lib/http` (barrel) en vez de `@/lib/http/client` (directo). Es funcionalmente equivalente pero inconsistente con la documentación.

---

## 7. Plan de Corrección Recomendado

### Prioridad 1 — Corregir services problemáticos

| Módulo | Service | Cambio requerido |
|--------|---------|-----------------|
| inventory | `sell-limit.service.ts` | Reemplazar `fetch()` con `httpRequest`, retornar DTOs, eliminar mapeo interno |
| revenue | `revenue-kpi.service.ts` | Reemplazar `fetch()` con `httpRequest`, retornar DTOs, eliminar mapeo interno |
| rates | `rate-restriction.service.ts` | Reemplazar `fetch()` con `httpRequest`, retornar DTOs, eliminar mapeo interno, agregar `Dto` suffix |

### Prioridad 2 — Crear hooks faltantes

| Módulo | Hook a crear | Responsabilidad |
|--------|-------------|-----------------|
| inventory | `use-sell-limits.ts` | Llamar service, mapear, manejar estado |
| revenue | `use-revenue-kpis.ts` | Llamar service, mapear, manejar estado |
| rates | `use-rate-restrictions.ts` | Llamar service, mapear, manejar estado |
| folio | `use-folio.ts` | Orquestar carga de folio |
| payments | `use-payments.ts` | Orquestar operaciones de pago |

### Prioridad 3 — Corregir barrel exports

| Módulo | Cambio |
|--------|--------|
| availability | Agregar exports de 4 DTO types faltantes |
| inventory | Remover exports de DTOs, mappers y services del `index.ts` |

### Prioridad 4 — Tests faltantes

| Módulo | Test a agregar |
|--------|---------------|
| folio | `createChargeRoutingRuleDto` service test |
| folio | `FolioSplitModal` component test |
| folio | `FolioTransferModal` component test |
| rates | Mock en `rate-plan.service.test.ts` |
| revenue | `KpiCards` component test |
| revenue | `KpiCharts` component test |

### Prioridad 5 — Correcciones menores

| # | Cambio |
|---|--------|
| 1 | Corregir deep imports en `src/data/mocks/handlers.ts` |
| 2 | Agregar `DomainMappingError` en `rate-restriction.mapper.ts` |
| 3 | Mover `RevenueKpiFilters` de `model/` a `dtos/` como `RevenueKpiRequestDto` |
| 4 | Normalizar DTOs de revenue a `snake_case` |

---

## 8. Referencia: Patrón Correcto

Ejemplo de service bien implementado (`rate-plan.service.ts`):

```ts
import { httpRequest } from "@/lib/http";

export async function fetchRatePlansDto(
  filters: RatePlanListFiltersDto,
  signal?: AbortSignal,
): Promise<RatePlanListResponseDto> {
  return httpRequest<RatePlanListResponseDto>({
    method: "GET",
    url: `/api/v1/private/rate-plans`,
    params: filters,
    signal,
  });
}
```

Ejemplo de service incorrecto (`sell-limit.service.ts`):

```ts
// ❌ No hacer
export async function fetchSellLimits(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<SellLimit[]> {          // Retorna domain, no DTO
  const res = await fetch(url);     // fetch directo, no httpRequest
  const data = await res.json();
  return toDomainSellLimitList(data); // Mapea dentro del service
}
```

---
