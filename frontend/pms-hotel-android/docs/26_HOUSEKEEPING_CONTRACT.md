# 26 — Housekeeping / Limpieza incluida

**Tarea:** IMP-AND-0110 — MOB-21. **Estado final:** COMPLETADA.

## Autoridad y alcance

La reconstrucción de `IMP-AND-0110` depende de `IMP-AND-0103` y `IMP-AND-0107`, verificadas como COMPLETADA en el backlog canónico. La fila canónica de `0110` queda COMPLETADA tras QA manual y revisión WEB-3 aprobadas. No se avanza `0111` ni tareas posteriores.

La ruta y parent-tab siguen el freeze de `23_EARLY_JOURNEY_V3_MIGRATION.md`. Los requisitos de reconstrucción confirman `10:00–11:00`, `FULL_CLEANING` / `Limpieza completa`, notas opcionales y estados. Para QA manual, la configuración local añade ejemplos temporales de franjas y tipos para validar los selectores. No son horarios ni servicios aprobados por el hotel, no definen Backend y deben sustituirse cuando producto o WEB-3 recupere una fuente autoritativa. No se inventan Node IDs ni se declara equivalencia visual Figma validada.

## Contrato mínimo frontend/mock

`services/housekeeping` mantiene boundary propio `HousekeepingService.submitRequest` con `MockHousekeepingService` sustituible. Su input frontend es:

```ts
interface HousekeepingRequest {
  timeSlot: HousekeepingTimeSlot;
  cleaningType: HousekeepingCleaningType;
  notes?: string;
}
```

`housekeepingQaTimeSlots` contiene provisionalmente `09:00–10:00`, `10:00–11:00`, `11:00–12:00` y `14:00–15:00`; `housekeepingQaCleaningTypes` contiene `FULL_CLEANING`, `LIGHT_CLEANING` y `TOWELS_AND_AMENITIES`. Ambos son catálogos mock/frontend para QA, con `10:00–11:00` y `FULL_CLEANING` como defaults. Los valores adicionales no son un contrato Backend ni una aprobación de producto.

`ReservationStay` se reutiliza exclusivamente para resolver y presentar la estadía actual, incluida la habitación asignada o `Habitación por asignar`. La identidad y el scope de un futuro request Backend todavía no están definidos: el mock frontend no fija esa decisión. Esta reconstrucción no envía IDs de Reservation, Stay ni Room.

`HousekeepingService.submitRequest(input)` devuelve `Promise<void>`; la UI solo necesita que la mutation resuelva. No crea una entidad persistida, lifecycle, status, ID ni respuesta Backend. Este contrato no modifica el catálogo de upselling aprobado en `16_SERVICES_CONTRACT_PROPOSAL.md` ni define API HTTP, permisos o reglas Backend.

La UI solo conserva horario, tipo y notas. Antes del submit aplica `notes.trim()` y omite `notes` si queda vacío. TanStack Mutation es la única autoridad del estado de envío; `isPending` y un guard síncrono `useRef` bloquean concurrencia. No hay éxito optimista, retry automático de mutation, almacenamiento permanente ni cola offline.

## Presentación y navegación

- Launcher accesible `Limpieza incluida` en Services usa `router.push('/services/housekeeping')`; conserva los cuatro upsells.
- QA reemplaza el botón superior por una flecha accesible fija, de target táctil 56 × 56, fuera del scroll y dentro de Safe Area; el CTA textual solo permanece en success.
- Tipo de limpieza usa una lista modal desde el catálogo temporal de QA. Horario usa `TimeWheelPicker` compartido con Valet en modo de slots: `FlatList` vertical con snap, fila central indicada y selección temporal hasta `Aceptar`; `Cancelar` conserva el campo principal.
- La pantalla reutiliza los estilos/tokens de Services y `GuestNavigationShell`; Servicios sigue activa en la ruta hija.
- `ReservationStay.room` muestra su número o exactamente `Habitación por asignar` cuando es null.
- Query de Stay: loading, generic error/retry y NetworkError/offline/retry.
- Mutation: submitting con formulario/CTA deshabilitados; success tras resolución; error/offline con formulario conservado y retry manual.
- Volver usa `router.dismissTo('/services')`: recupera el destino del stack o lo reemplaza si se entra directamente. Android Back desde el launcher conserva el stack estándar.
- Notas multiline con soporte de teclado y scroll; radios, CTA y launcher tienen semántica accesible y testIDs estables.

## Validación y cierre

Suite `tests/housekeeping.test.tsx`: fixture de Stay, room nullable, defaults, selector temporal de QA, rueda con confirmación/cancelación, notas multiline/trim/omisión, payload sin IDs incluso si cambian los IDs de los fixtures de Stay y Reservation, submitting, doble envío inmediato/pending, success diferido, errores/offline y retry de query/mutation, y navegación productiva con launcher/Back/retorno desde success.

QA manual: PASS. Revisión WEB-3: PASS. Ambas validaciones cierran `IMP-AND-0110` como COMPLETADA. Esta aprobación no ratifica los catálogos QA como producto ni contrato Backend: las franjas y tipos adicionales siguen siendo datos frontend/mock provisionales y deberán sustituirse si producto define un catálogo autoritativo.

Validación automatizada de esta reconstrucción: `npm run lint` PASS (0), `npm run typecheck` PASS (0), `npm run test` PASS (0; 14 suites / 86 tests, incluidos 14 de Housekeeping), `npx expo-doctor` PASS (21/21) y `npx expo export --platform android` PASS (0). Persiste un warning de deprecación de DateTimePicker en la suite existente de Valet.
