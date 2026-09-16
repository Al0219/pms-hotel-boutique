# 16 — Contrato frontend de datos/mocks aprobado para Servicios

**Estado:** **APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0103**.

**Tarea relacionada:** `IMP-AND-0103` puede pasar a `READY` una vez que el backlog registre esta aprobación. El DoD no está iniciado: este documento no autoriza código, una rama feature, tests de la feature ni el cambio de la tarea a `EN_PROGRESO`.

## Propósito y límite

Web y Android se implementan antes que Backend. De acuerdo con `DEC-G-013`, este contrato fija únicamente los datos de fixture/mock, escenarios de UI y boundaries que Android necesita para implementar y probar Servicios durante la fase frontend-first.

No es un contrato API Backend. No define endpoints, métodos HTTP, payloads Backend, auth, permisos, idempotencia, persistencia, entidades, migraciones, tablas, auditoría, status codes ni reglas Backend. Cuando exista Backend, será autoridad de su API y Android adaptará esa forma con DTO/Mapper sin exponer DTOs a UI.

`app/(guest)/services.tsx` permanece como handoff técnico de `IMP-AND-0102` hasta que `IMP-AND-0103` sea iniciada de forma autorizada.

## Evidencia visual aprobada

- Fuente base de Servicios: `239:132 — MOB-10 — Servicios / Upselling`, dentro de `238:132 — Implementation Ready — Android V2 + V3`.
- Estados de Servicios aprobados para implementación: sección `1818:410 — APPROVED FOR IMPLEMENTATION — IMP-AND-0103 — Services states`.
- Frames: Base `1821:410`, Selected `1818:411`, Loading `1819:410`, Submitting `1820:410`, Success `1820:13372`, Error `1820:13290` y Offline `1820:13331`.
- El flujo autorizado de producto es Base → Selected → Submitting → Success → Base. Error y Offline son variantes **QA ONLY**, accesibles desde `1827:411 — QA ONLY — Services failure variants`; no son acciones normales del huésped.
- La fixture original contenía cuatro upsells. La decisión de producto retira `Desayuno en habitación` porque su flujo pertenece a Room Service, `Traslado aeropuerto` porque pertenece a Valet/Transfer y Decoración especial del alcance Android actual. El catálogo inline final conserva únicamente `Late check-out` / `Hasta 14:00` / `Q180`; `Limpieza` y `Room Service` son launchers a flujos dedicados, no upsells inline.
- `priceText` es texto de presentación visual. No representa monto, moneda, impuesto, cargo ni semántica financiera Backend.
- Los estados visuales no agregan pagos, cargos, promesas de procesamiento ni status Backend. No se añade estado Empty.

Los Node IDs anteriores son exclusivamente trazabilidad Figma; no son IDs runtime ni valores de fixture.

## Forma exacta del contrato frontend/mock

Los siguientes nombres son exclusivamente DTOs de fixture frontend. No son DTOs API productivos ni modelos Backend. No se agregan campos fuera de esta forma.

```ts
interface ServicesFixtureContext {
  currentStayFixtureKey: string;
  currentPropertyFixtureKey: string;
}

interface ServiceCatalogFixtureDto {
  fixtureKey: string;
  label: string;
  detailText: string;
  priceText: string;
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

`fixtureKey`, `currentStayFixtureKey` y `currentPropertyFixtureKey` son claves técnicas opacas para fixtures y tests. No son IDs Backend, no se muestran como información de negocio y no fijan cómo Backend resolverá el scope futuro.

La relación visual con la estadía/property actual se representa con `ServicesFixtureContext`. Cuando Servicios necesite presentar habitación, debe obtenerla de `ReservationStay`; `room` conserva su nulabilidad confirmada y Servicios nunca inventa una habitación asignada.

El detalle es inline: la selección busca localmente `fixtureKey` dentro del catálogo ya recibido y reutiliza `label`, `detailText` y `priceText` en `Tu selección`. No hay ruta, fuente remota ni contrato independiente de detalle.

## Campos acordados y exclusiones

| Campo | Uso frontend demostrado | Límite |
| --- | --- | --- |
| `currentStayFixtureKey` | Asocia determinísticamente el catálogo fixture con la estadía actual. | Solo fixture/test; no amplía `ReservationStay`. |
| `currentPropertyFixtureKey` | Mantiene el scope fixture de property actual requerido por la tarea. | No es filtro ni ID Backend. |
| `fixtureKey` | Identifica localmente la card seleccionada y el input de mutation. | Opaco; no se reutiliza como API. |
| `label` | Nombre visible en card, selección y basket. | Texto de presentación. |
| `detailText` | Texto secundario visible en la card y selección. | No infiere disponibilidad, horario ni regla de negocio. |
| `priceText` | Precio visible en la card y selección. | Texto de presentación, sin significado financiero. |
| `serviceFixtureKey` | Comunica a la mutation mock cuál fixture seleccionó el huésped. | Único input de solicitud simulada. |

Quedan excluidos: precio numérico, currency, impuestos, categorías de negocio, disponibilidad, horarios, cantidades, habitación copiada, IDs Backend de Reservation/ReservationStay/ServiceRequest, datos de huésped, notas, cancelación, modificación, timestamps, persistencia y estados de solicitud de negocio.

## Comportamiento mock y estados UI

El mock se conecta en la frontera Remote/API y conserva `Remote/API → DTO fixture → Mapper puro → Domain → TanStack Query/RemoteState derivado → UI`. La UI no hace `fetch`, no consume DTOs ni importa fixtures directamente.

### Lectura de catálogo

| Estado | Contrato de comportamiento |
| --- | --- |
| `loading` | La query está pendiente antes de resolver el catálogo fixture; se muestra `Cargando servicios`. |
| `success/data` | El catálogo fixture del contexto actual se mapea a Domain y permite selección inline. |
| `error` | La lectura mock falla con un error técnico; no implica estado Backend. |
| `offline` | La lectura mock falla con la infraestructura existente `NetworkError`; `deriveRemoteState` lo representa como offline. |

`empty` no está incluido: no es Acceptance Criterion actual ni tiene fuente visual aprobada.

### Mutation de solicitud simulada

| Estado | Contrato de comportamiento |
| --- | --- |
| `idle` | No existe solicitud en curso. |
| `submitting` | La mutation mock está pendiente; se conserva la selección, se muestra `Confirmando...` y el CTA queda disabled. |
| `success` | Solo ocurre tras recibir `SubmitServiceRequestFixtureResult`; Late check-out muestra el overlay local `Servicio solicitado` con `Hemos recibido tu solicitud.`, cerrable con `X` o backdrop. No crea una ruta ni sustituye `/services`. |
| `error` | La mutation mock falla técnicamente; se muestra `No pudimos enviar tu solicitud`, `Intenta nuevamente.` y `Reintentar`. |
| `offline` | La mutation mock falla con `NetworkError`; se muestra `Sin conexión`, `Conéctate a internet para solicitar este servicio.` y `Reintentar`. |

Mientras la mutation esté pendiente, el handler debe bloquear una segunda mutation concurrente. No hay éxito optimista. Reintentar inicia una mutation mock nueva y controlada; no hay retry automático, cola offline, sync en background, almacenamiento offline ni NetInfo.

El resultado mock no representa una entidad `ServiceRequest`, persistencia, status Backend ni una promesa de procesamiento posterior.

## Navegación y presentación

`IMP-AND-0103` debe reutilizar el `GuestNavigationShell` V3 de `IMP-AND-0100`, sin copiar una footbar privada. En `/services`, la navegación visible es `Servicios · Chat · Valet · Cuenta`, con Servicios activo según `usePathname()`. Las rutas no implementadas conservan su semántica disabled aprobada por `DEC-A-004`.

La UI debe usar los tokens y patrones Android V3 existentes. La excepción visual previa de `IMP-AND-0102` no se modifica ni se reutiliza como navegación de Servicios.

## Boundaries obligatorios

```text
Mock Remote/Fixture
  ↓
Fixture DTO frontend-only
  ↓
Mapper puro
  ↓
Domain
  ↓
TanStack Query (autoridad de server state)
  ↓
RemoteState derivado
  ↓
UI
```

TanStack Query es la única autoridad del server state. `RemoteState` es una representación técnica derivada de los resultados de Query; no es store paralelo. La infraestructura existente de `NetworkError` y `deriveRemoteState` es suficiente para los escenarios offline simulados de Sprint 1.

## Pruebas obligatorias cuando inicie `IMP-AND-0103`

1. catálogo mock visible para el contexto fixture de estadía/property actual;
2. los dos servicios inline y los dos launchers dedicados visibles;
3. mapper puro de fixture DTO a Domain;
4. `label`, `detailText` y `priceText` visibles sin campos inventados;
5. selección inline y basket `Tu selección`;
6. submitting con CTA disabled y sin segundo submit;
7. success solo después del resultado de mutation mock;
8. error técnico;
9. `NetworkError` derivado a offline;
10. retry como mutation mock nueva y controlada;
11. reutilización del shell V3 con Servicios activo;
12. UI sin DTO;
13. UI sin `fetch` directo;
14. sin success optimista, estado Backend ni persistencia implícita.

No se implementan estos tests ni código de Servicios con la aprobación de este documento.

## Matriz formal del DoR

| # | Criterio DoR | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | `IMP-AND-0100` completada | PASS | Shell Guest V3 completado. |
| 2 | `IMP-AND-0102` completada | PASS | Home V2 permanece intacta; entrega el handoff técnico. |
| 3 | Ruta y fuente Figma confirmadas | PASS | `/services`; base `239:132` y sección de estados `1818:410`. |
| 4 | Fixture de catálogo | PASS | `ServicesCatalogFixtureDto` exacto. |
| 5 | Selección y detalle inline | PASS | `fixtureKey` + `label`/`detailText`/`priceText`; no detail route. |
| 6 | Mutation mock | PASS | Input/result exactos de solicitud simulada. |
| 7 | Loading de lectura | PASS | Frame `1819:410` y Query pendiente. |
| 8 | Submitting | PASS | Frame `1820:410`, CTA disabled y bloqueo concurrente. |
| 9 | Success | PASS | Frame `1820:13372`, únicamente tras resultado mock. |
| 10 | Error | PASS | Frame `1820:13290`, error técnico y retry controlado. |
| 11 | Offline | PASS | Frame `1820:13331`, `NetworkError` sin NetInfo ni cola. |
| 12 | Prevención de doble envío | PASS | Una mutation concurrente como máximo. |
| 13 | Boundary Mapper/UI | PASS | DTO fixture → Mapper puro → Domain; UI sin DTO/red. |
| 14 | Pruebas unitarias/UI definidas | PASS | Lista de 14 pruebas obligatorias anterior. |
| 15 | Contrato solo frontend | PASS | `DEC-G-013`; sin API/semántica Backend anticipada. |

No existe en el backlog ni en la documentación vigente un gate adicional de reviewer para aprobar este contrato frontend/mock. El reviewer asignado de la tarea es `WEB-3`; esta aprobación no modifica ownerships ni crea una autoridad cross-app nueva.

## Fuera de alcance

- Implementar `IMP-AND-0103`, modificar `services.tsx`, crear feature branch, DTOs productivos, mappers, Domain, hooks, queries, mutations, fixtures funcionales o tests de Servicios.
- Endpoints, auth, permisos, entidades, tablas, migraciones, persistencia, audit, reglas Backend o estados de negocio/cross-app de una solicitud.
- Cambiar Figma, `IMP-AND-0100` o `IMP-AND-0102`.

La política temporal frontend/mock del Hotel Boutique define checkout estándar `12:00`. Late check-out usa exclusivamente `ReservationStay.departure` como `serviceDate` y el valor estructurado frontend/mock `lateCheckoutUntil: '14:00'`: es una excepción aprobada al checkout estándar. El huésped no elige fecha ni hora; los valores no se extraen del copy visual. Una futura configuración de propiedad o Backend podrá sustituir esta política sin convertirla hoy en contrato Backend.

## UX regression IMP-AND-0113

Late check-out exitoso navega a Cuenta con el aviso de solicitud registrada; no existe una pantalla de éxito intermedia. La regresión UX incluida en `IMP-AND-0113` fue validada con QA manual y revisión WEB-3 PASS; no altera el estado COMPLETADA de este contrato.
