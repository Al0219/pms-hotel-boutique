# Calendario Staff con datos reales

Estado: **COMPLETADA**, 2026-10-08; QA manual **PASS** confirmado por Alan. Incremento autorizado por Alan sobre el Gantt
existente de `/calendario`, rama `feature/staff-calendar-real`. Sin commit/push/merge.
Owner de integración Alan; UI WEB-3, reviewer de dominio WEB-4 según la fila
relacionada `IMP-WEB-0308`. No se edita XLSX ni se declara completada esa fila.
La fila figura PENDIENTE; esta solicitud autoriza únicamente su conexión real,
con los criterios enumerados por Alan, conservando presentación/navegación.

DoR de este alcance: PropertyContext/Staff C2, Reservas listado/detalle y
asignación física reales completados, Habitaciones reales existentes;
[Reservations49](../../../backend/docs/49_STAFF_RESERVATIONS_READ_CONTRACT.md),
[asignación50](../../../backend/docs/50_STAFF_INITIAL_ROOM_ASSIGNMENT_CONTRACT.md),
[Rooms17](../../../backend/docs/17_BD2_ROOMS_CRUD_CONTRACT.md) y
[RoomTypes16](../../../backend/docs/16_BD2_ROOM_TYPES_CRUD_CONTRACT_PROPOSAL.md).
No requiere endpoint Calendar nuevo: compone las lecturas aprobadas existentes.

## Cierre confirmado — 2026-10-08

Alan confirmó «QA manual PASS» y autorizó marcar el incremento **COMPLETADA**.
Aceptación y DoD del alcance de integración: **PASS**; transición EN_QA → COMPLETADA.
La confirmación del owner se registra separada de los tests automatizados; no
atribuye al agente una nueva ejecución de navegador/PostgreSQL ni resultados
individuales no informados. Los casos sin fixtures conservan sus límites de QA.

Se incluye el ajuste autorizado de orden ascendente natural por código de
habitación, con **Sin asignar** separado al final y sin cambiar datos/lógica.
Este cierre es documental: `git diff --check` PASS y archivos funcionales previos
preservados. No se repiten suites ni se ejecuta CI remoto, publicación o merge.
No se edita XLSX ni se cierran tareas Backend/alcances ajenos. Nuevos incrementos
requieren autorización independiente.

## Comportamiento verificable

- App resuelve PROPERTY desde `usePropertyScope` y sesión Staff; no usa property
  fija/env. Scope ausente/ALL_PROPERTIES pide un hotel específico antes de montar
  el Calendario. Remonta por sesión/property.
- Reutiliza `useStaffReservationStays` y `useRooms` por BFF same-origin:
  `/api/staff/reservations`, `/api/staff/rooms`, `/api/staff/room-types`, siempre
  con propertyId. El Calendario usa estos transportes con ambos flags de mocks.
  Conserva Service → DTO → Mapper → Domain → Hook → UI; no modifica BFF/Backend.
- Cada stay tiene barra/identidad independiente por stayId, sus fechas
  `[arrival, departure)` y habitación por roomId. Room=null → **Sin asignar**.
  Un ID asignado ausente del inventario o scope inconsistente da error recuperable,
  sin convertir esa habitación en libre o esa stay en pendiente de asignar.
- Estados visibles de stay: RESERVED, IN_HOUSE, CHECKED_OUT, CANCELLED, NO_SHOW,
  con etiquetas de presentación. Tooltip conserva también estado del padre y
  código confirmado. Las fechas no generan transiciones. Header sin stays no
  inventa barra. Datos históricos/terminales se muestran en su ventana sin
  contarlos como ocupación activa.
- Footer: habitaciones con al menos una stay RESERVED/IN_HOUSE cuyo padre no está
  cancelado / total de habitaciones físicas; cada habitación cuenta una vez.
  Las barras solapadas se conservan separadas, no se sobreponen. No es ATS ni
  disponibilidad vendible, y no acredita limpieza/OOO/OOS; operación real sin
  fuente queda null. Sin habitaciones aún puede mostrarse una stay sin asignar.
- Filas por código de habitación ascendente natural (`2`, `10`, `101`; `A2`,
  `A10`), conservando datos originales y **Sin asignar** separado al final.
- Gantt/CSS, navegación anterior/Hoy/siguiente (14 días), scroll y enlaces a
  `/reservas/{reservationId}` conservados. Cada barra enlaza al padre correcto.
- Queries separadas por sesión/property; no muestra grilla cacheada mientras
  alguna lectura está refrescando. Al volver a property o pantalla se consulta
  nuevamente; foco del navegador refresca según TanStack existente. Asignar desde
  detalle invalida el mismo prefijo de stays que consume Calendario. No polling
  ni nuevas mutaciones. Errores/red permiten reintentar ambas fuentes.

## Guía de QA manual — PASS confirmado por Alan

Con Backend/DB y BFF configurados como en las lecturas reales existentes, iniciar
Web desde la raíz del monorepo:

```bash
cd /mnt/Datos/Proyectos/GitHub/pms-hotel-boutique/frontend/pms-hotel-web
NEXT_PUBLIC_USE_MOCK_API=false npm run dev
```

1. Entrar a `/acceso` como Staff autorizado con RESERVATION_MANAGE; seleccionar
   hotel específico. Abrir `/reservas` y elegir una reserva persistida con N stays.
   Anotar su código, fechas y habitaciones desde el detalle real; no inventar IDs.
2. Abrir `/calendario`; en Network comprobar los tres GET BFF con la propiedad
   seleccionada, sin peticiones a pms.test. Navegar ventanas hasta las fechas
   reales; verificar una barra por stay en su propia habitación o Sin asignar,
   fechas independientes y ausencia de barra en el día de checkout. Cada enlace
   abre el detalle de esa Reservation, incluso las stays sin asignar.
3. Desde una stay real elegible room=null asignar con el diálogo existente una
   habitación ofrecida por Backend. Volver a Calendario: barra en la habitación
   confirmada, desaparece de Sin asignar; las otras stays permanecen iguales.
   Repetir con otra stay si existe. Confirmar también la lectura en Habitaciones.
4. Cambiar a otra propiedad autorizada con Network lento: desaparecen datos del
   hotel anterior durante la carga. Verificar respuesta vacía/datos del nuevo
   hotel y volver al primero; esperar nueva lectura, sin asignaciones cacheadas
   antiguas. ALL_PROPERTIES muestra selección específica y no consulta Calendar.
5. Con fixtures reales disponibles contrastar IN_HOUSE/CHECKED_OUT/CANCELLED/NO_SHOW
   con detalle y footer. Fechas pasadas no cambian estados. Si faltan fixtures,
   registrar NO EJECUTABLE manual; no alterar estados SQL ni inventar OOO/limpieza.
   Probar hotel vacío y header sin stays si existen: sin falsas barras.
6. Network offline/fallo de lectura: estado de error sin grilla vieja; restaurar
   red y Reintentar. Cerrar sesión/Guest no da acceso a datos Staff. No divulgar
   cookies/tokens al registrar evidencia. Verificar ventana estrecha y escritorio,
   scroll contenido, teclado/foco de barras/controles y enlaces navegables.

Registrar fecha, property/código real, casos PASS/FAIL/NO EJECUTABLE y capturas sin
secretos. La evidencia automatizada usa fixtures; no sustituye QA contra PostgreSQL.
En la entrega técnica inicial el agente no ejecutó QA manual ni CI remoto y
registró EN_QA. El estado vigente es **COMPLETADA** tras el PASS manual comunicado
por Alan en el cierre anterior; esta guía se conserva para regresión.

## Validación técnica

```bash
cd /mnt/Datos/Proyectos/GitHub/pms-hotel-boutique/frontend/pms-hotel-web
npm run test -- src/modules/reservations src/modules/rooms 'src/app/(private)/staff-property-workspace.test.tsx' src/data/mocks/worker-boundary.test.ts --maxWorkers=2
npm run typecheck
npm run lint
NEXT_PUBLIC_USE_MOCK_API=false npm run build
cd /mnt/Datos/Proyectos/GitHub/pms-hotel-boutique
git diff --check
```

- Batería focalizada ampliada: **419 PASS / 63 archivos**; log
  `/tmp/pms-calendar-focused.log` (Reservas, Habitaciones, composición Staff y
  boundary MSW).
- Verificación final tras los ajustes de estado vacío: **38 PASS / 5 archivos**,
  Calendario, composición Staff e integración real de asignación.
- Ajuste posterior de orden de filas: `npm run test -- src/modules/reservations/calendar
  --maxWorkers=2` → **22 PASS / 3 archivos**; `git diff --check` PASS. Prueba de
  orden numérico/alfanumérico, Sin asignar al final e inmutabilidad de fuentes.
- Typecheck, lint y build con `NEXT_PUBLIC_USE_MOCK_API=false`: **PASS**.
  Logs `/tmp/pms-calendar-typecheck.log`, `/tmp/pms-calendar-lint.log`,
  `/tmp/pms-calendar-build.log`; typecheck/lint repetidos tras el ajuste final.
  Build omite TypeScript internamente; el typecheck separado sí fue ejecutado.
- `git diff --check`: **PASS**; next-env generado restaurado al contenido inicial.
- Casos automatizados: N stays, fechas independientes/checkout exclusivo,
  asignadas/null, estados terminales y padre cancelado, conflictos sin duplicar
  conteo, errores de scope/referencias, carga/error/offline/retry/empty,
  PropertyContext sin fallback env, cambios de property con lecturas demoradas
  y regreso a caché, asignación por BFF que mueve ambas barras de Sin asignar
  a sus habitaciones. No nuevas dependencias ni cambios Backend/OpenAPI.
