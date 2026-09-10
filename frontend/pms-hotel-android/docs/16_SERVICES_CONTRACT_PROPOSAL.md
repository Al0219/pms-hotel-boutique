# 16 — Propuesta de contrato frontend de datos/mocks para Servicios

**Estado:** PROPUESTA PENDIENTE DE REVISIÓN Y APROBACIÓN. No es contrato API Backend, DEC aprobada ni autorización para iniciar `IMP-AND-0103`.

**Tarea relacionada:** `IMP-AND-0103` permanece `PENDIENTE`. Su DoR vigente sigue siendo `Service contract ready` y no se considera cumplido hasta que el Change Control apruebe explícitamente su reemplazo frontend-first.

## Propósito y límite

Web y Android se implementan antes que Backend. Esta propuesta define únicamente el contrato de datos/mocks que Android necesitaría para construir y probar la UI de Servicios sin convertir fixtures en una API anticipada.

El contrato futuro de Backend se diseñará e implementará después. Cuando exista, Backend será autoridad de su API y Android adaptará esa forma mediante DTO/Mapper sin exponer DTOs a UI.

Este documento no fija endpoints, métodos HTTP, payloads Backend, auth, permisos, idempotencia Backend, persistencia, entidades, migraciones, tablas, auditoría, status codes, reglas Backend ni contratos cross-app nuevos.

`app/(guest)/services.tsx` permanece como handoff técnico de `IMP-AND-0102`; este documento no autoriza modificarlo ni implementar la feature.

## Fuentes y límites confirmados

- La fila `IMP-AND-0103` del backlog pide catálogo, detalle/selección y solicitud de servicios de la estadía/property actual; exige loading, submitting, success, error y offline, sin éxito falso ni doble submit. Su DoD indica Mapper + UI y pruebas unitarias/UI.
- `frontend/pms-hotel-android/docs/01_FIGMA_SCREEN_CATALOG.md` ubica Servicios en `238:132 — Implementation Ready — Android V2 + V3`. La documentación disponible no registra un Node ID o campos visuales detallados de esa pantalla. La fuente Figma directa requiere contraseña en el acceso actual, por lo que esos detalles no se consideran verificados.
- `frontend/pms-hotel-android/docs/05_DOMAIN_AND_CONTRACT_RULES.md` confirma `ReservationStay`, su distinción de `Reservation` y `room` nullable. El DTO de estadía existente es una forma de fixture/mock, no API.
- `frontend/pms-hotel-android/docs/07_MOCK_AND_DATA_POLICY.md` permite mocks en la frontera Remote/API y exige el flujo DTO -> Mapper -> Domain -> UI.
- `frontend/pms-hotel-android/docs/08_STATE_OFFLINE_POLICY.md` establece TanStack Query como fuente de server state. `NetworkError` representa offline simulado; no se usan NetInfo, cola offline, persistencia local ni éxito optimista.
- `docs/07_CROSS_APP_CONTRACTS.md` prohíbe inventar semántica compartida. El estado de solicitud de servicio no está confirmado como estado cross-app.

## Forma exacta propuesta del contrato frontend/mock

Los nombres siguientes son solo formas de fixture frontend. No son DTOs API productivos ni modelos Backend.

```ts
interface ServicesFixtureContext {
  currentStayFixtureKey: string;
  currentPropertyFixtureKey: string;
}

interface ServiceCatalogFixtureDto {
  fixtureKey: string;
  label: string;
}

interface ServicesCatalogFixtureDto {
  context: ServicesFixtureContext;
  items: ServiceCatalogFixtureDto[];
}

interface SubmitServiceRequestFixtureInput {
  serviceFixtureKey: string;
}

interface SubmitServiceRequestFixtureResult {
  serviceFixtureKey: string;
}
```

`currentStayFixtureKey` y `currentPropertyFixtureKey` solo permiten que tests y mocks asocien determinísticamente el catálogo con la estadía/property actual. No amplían `ReservationStay`, no son IDs Backend y no describen cómo Backend resolverá scope. Cuando la UI presente datos de habitación, los obtiene de `ReservationStay`; por ello `room` conserva su nulabilidad existente y no se inventa habitación desde Servicios.

La selección y detalle se resuelven localmente buscando `fixtureKey` dentro del catálogo mock ya obtenido y reutilizando el `label` del fixture. No se propone endpoint ni fuente remota independiente para detalle, ni contenido adicional hasta verificarlo en Figma.

## Campos incluidos y justificación

| Campo | Necesidad demostrable | Regla propuesta |
| --- | --- | --- |
| `currentStayFixtureKey` | El Acceptance Criterion limita los servicios a la estadía actual. | Solo fixture/test; debe coincidir con el contexto de estadía seleccionado por el mock. |
| `currentPropertyFixtureKey` | El Acceptance Criterion limita los servicios a la property actual y las reglas globales exigen scope explícito cuando aplica. | Solo fixture/test; no es un filtro Backend ni un ID futuro. |
| `fixtureKey` | Catálogo, selección, detalle y mutation requieren identificar de forma estable el ítem mock elegido. | Identidad técnica local, opaca para UI de negocio y no reutilizable como API. |
| `label` | Un catálogo y un detalle necesitan identificar visualmente el servicio seleccionado. | Texto de presentación mínimo; sus valores concretos requieren una fuente visual de Servicios verificada. |
| `serviceFixtureKey` | La acción de usuario necesita comunicar cuál fixture seleccionó a la mutation mock. | Único input de solicitud simulada. |

## Campos excluidos deliberadamente

No se agregan precio, currency, impuestos, categoría de negocio, disponibilidad de negocio, horarios, cantidades, habitación copiada, Reservation/ReservationStay IDs Backend, ServiceRequest IDs Backend, Guest data, notas/instrucciones, cancelación, modificación, estado de solicitud, timestamps, persistencia ni reglas de backend.

No se añade un estado visual empty como requisito. La infraestructura de mocks puede representar `items: []`, pero `empty` no figura entre los Acceptance Criteria confirmados de `IMP-AND-0103`; una pantalla empty necesitaría fuente Figma o criterio aprobado.

## Solicitud simulada y estados UI

La acción del huésped entrega `SubmitServiceRequestFixtureInput` a una mutation mock. La mutation devuelve `SubmitServiceRequestFixtureResult` solo para confirmar que la simulación concluyó. Ese resultado no representa una entidad `ServiceRequest`, persistencia Backend ni éxito remoto real.

### Lectura de catálogo

| Estado | Representación propuesta |
| --- | --- |
| loading | TanStack Query pendiente antes de resolver el catálogo fixture. |
| success/data | Catálogo fixture asociado al contexto actual y mapeado a Domain. |
| error | Error técnico genérico de la lectura mock. |
| offline | `NetworkError` simulado en la frontera remota. |

### Mutación de solicitud simulada

| Estado | Representación propuesta |
| --- | --- |
| idle | No hay solicitud en curso o el estado se reinició tras una interacción aprobada. |
| submitting | La mutation mock está pendiente. |
| success | Solo después de que la mutation mock devuelve `SubmitServiceRequestFixtureResult`. |
| error | La mutation mock devuelve un error técnico genérico. |
| offline | La mutation mock falla con `NetworkError`. |

No se introduce NetInfo, cola offline, almacenamiento local, reintento automático, estado Backend ni éxito optimista.

## Prevención de doble envío

Mientras la mutation mock esté pendiente, la acción de solicitar debe quedar bloqueada o deshabilitada. El handler no puede iniciar una segunda mutation concurrente. La UI no anuncia success hasta recibir el resultado simulado de la primera mutation. Esta es una regla de interacción frontend para cumplir el Acceptance Criterion; no es idempotencia Backend.

## Arquitectura propuesta

```text
Mock Remote/Fixture
  ↓
DTO de fixture frontend-only
  ↓
Mapper puro
  ↓
Domain
  ↓
TanStack Query
  ↓
UI
```

El DTO de fixture puede reemplazarse o adaptarse cuando exista Backend real. UI no consume DTO, no hace `fetch` y no conoce la futura estructura Backend. TanStack Query sigue siendo la única autoridad de server state; `RemoteState` solo deriva la representación técnica de sus resultados.

## Pruebas que este contrato habilitaría en `IMP-AND-0103`

- catálogo mock visible para la estadía/property fixture actual;
- selección por `fixtureKey` y detalle resuelto con el `label`, sin inventar contenido adicional;
- mutation en `submitting`;
- success solo después del resultado mock;
- error técnico genérico;
- `NetworkError` derivado a offline;
- acción bloqueada y una sola mutation mientras existe submit pendiente;
- mapper puro para fixture DTO -> Domain;
- UI sin DTO ni red directa.

No se implementan estas pruebas con esta propuesta.

## DoR candidato para `IMP-AND-0103`

> **Frontend service data/mock contract approved:** fuente Figma y ruta confirmadas; formas de mock para catálogo, selección y solicitud simulada; asociación con estadía/property actual sin alterar semántica de dominio; escenarios loading, submitting, success, error y offline; boundaries Mapper/UI y pruebas unitarias/UI definidos. No constituye contrato API Backend ni define endpoints, HTTP, auth, permisos, persistencia, entidades o estados de negocio Backend.

`docs/10_CHANGE_CONTROL.md` requiere aprobación para cambiar DoR/DoD. Por tanto, este texto es candidato: no reemplaza todavía `Service contract ready`, no convierte `IMP-AND-0103` a `READY` y no declara el DoR vigente como cumplido.

## Decisiones todavía pendientes

1. Aprobar la estrategia frontend-first propuesta en `DEC-G-013` mediante Change Control.
2. Confirmar la fuente visual concreta de Servicios dentro de Figma antes de añadir contenido más allá de `label`.
3. Aprobar este contrato de fixtures y el reemplazo de DoR en el backlog.
4. Definir el contrato Backend real solo cuando inicie la fase Backend; sus decisiones no se anticipan aquí.

## Fuera de alcance

- Modificar `services.tsx` o iniciar `IMP-AND-0103`.
- Crear DTOs, mappers, Domain, hooks, queries, mutations, fixtures funcionales o tests de Servicios.
- Crear endpoints, auth, permisos, entidades, tablas, migraciones, persistencia, audit, reglas de negocio o arquitectura Backend.
- Declarar estados de negocio/cross-app para una solicitud de servicio.
