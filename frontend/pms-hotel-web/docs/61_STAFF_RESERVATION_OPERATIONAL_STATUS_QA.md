# Estados visibles de Reservas — 2026-10-08

Estado: **COMPLETADA**; QA manual de estados operativos PASS confirmado por Alan
el 2026-10-08 y cierre documental autorizado. Corrección de presentación sobre el
listado/detalle Staff real existentes (IMP-WEB-0301/0302, WEB-3/reviewer WEB-4).
No crea ID/fila nueva ni edita XLSX. Dependencias: lecturas
[Backend49](../../../backend/docs/49_STAFF_RESERVATIONS_READ_CONTRACT.md) y
[asignación real50](../../../backend/docs/50_STAFF_INITIAL_ROOM_ASSIGNMENT_CONTRACT.md),
ambas COMPLETADAS. Conserva el trabajo sin commit de
ese incremento en feature/staff-room-assignment-real; no modifica Backend.

## Proyección de presentación

`Reservation.status` y el estado/roomId de cada stay permanecen originales.
Una función pura Domain deriva `operationalStatus` después de validar el DTO,
y el mapper real reutiliza el resultado en listado y detalle. No forma parte del
DTO/BFF/OpenAPI ni se persiste. Los comandos siguen comprobando el status real,
la stay concreta y los permisos existentes. No se infieren check-in, check-out,
No show ni pagos desde fechas, hora actual, room labels, tarifas o receipts.

La precedencia de presentación aplicada, de arriba abajo:

| Condición con datos reales | Badge y filtro |
| --- | --- |
| Reservation CANCELLED | Cancelada |
| Sin stays | Pendiente/Confirmada según el padre; Cancelada ya tiene precedencia |
| Todas las stays CANCELLED | Cancelada |
| Alguna stay no cancelada IN_HOUSE | En estancia |
| Todas las stays no canceladas CHECKED_OUT | Completada |
| Todas las stays no canceladas NO_SHOW | No show |
| Padre PENDING sin las condiciones anteriores | Pendiente |
| Hay stays RESERVED, todas con roomId; las demás no canceladas son CHECKED_OUT | Asignada |
| Resto de padre CONFIRMED | Confirmada |

Una asignación parcial continúa Confirmada; con padre PENDING continúa Pendiente,
incluso si se asignaron habitaciones. Stays canceladas no exigen Room.
Completada requiere salida de todas las no canceladas; No show requiere ese
estado en todas las no canceladas. En mezclas NO_SHOW + CHECKED_OUT o NO_SHOW +
RESERVED sin IN_HOUSE, conservar Pendiente/Confirmada y los estados independientes
de las stays; no atribuir cierre global ni reasignación. Ningún caso vacío dispara
una conclusión terminal por `every([])`.

Estas reglas son agregación visual de los siete estados solicitados, sin reglas
nuevas de transición Backend. La precedencia para mezclas se comunicó durante la
implementación; el QA manual de estados operativos fue confirmado PASS por Alan
en el cierre de este incremento, sin cambiar transiciones ni estados Backend.

Listado y detalle comparten etiquetas/criterio. El filtro real muestra Todas +
Pendientes, Confirmadas, Asignadas, En estancia, Completadas, No show, Canceladas,
filtra la proyección y conserva búsqueda/fechas/paginación/reset. Confirmadas no
incluye una reserva cuya proyección ya es Asignada/En estancia/Completada/No show.
Los adapters provisionales históricos conservan WAITLIST/NO_SHOW_PENDING y sus
acciones únicamente para sus propios datos; no inventar esas opciones en el
listado real. Refrescar tras asignar recalcula el badge; nunca actualizarlo antes
del PUT200 seguido por la lectura real.

## Guía de QA manual — mocks=false

Ejecutar sobre un stack que incluya estos cambios de la rama actual.

1. Comparar una reserva real sin Room: badge Confirmada (o Pendiente según padre)
   en listado y detalle. Corroborar que no cambian status/fechas/stay IDs reales.
2. N stays RESERVED: asignar una → Confirmada mientras quede una sin Room;
   completar asignación → Asignada si padre CONFIRMED. Padre PENDING sigue
   Pendiente. Volver al listado y filtrar Asignadas/Confirmadas; verificar que cada
   reserva coincide con su badge sin recargar browser.
3. Con fixtures existentes IN_HOUSE/CHECKED_OUT/NO_SHOW/CANCELLED, contrastar cada
   badge y filtro con la tabla de precedencia, especialmente mezclas y stays
   canceladas. No crear estados vía SQL ni habilitar mutaciones para aparentar QA;
   si falta un caso real, NO EJECUTABLE manual, cubierto por tests aislados.
4. Header sin stays no produce Asignada/Completada/No show; fechas pasadas por sí
   solas conservan Pendiente/Confirmada. Stay-room-null no se reemplaza con dato mock.
5. Combinar estado + búsqueda + fechas; limpiar filtros y cambiar property.
   Verificar paginación reiniciada y resultados/badges coherentes, sin filas del
   scope anterior ni acciones de cancelación/move/extension habilitadas por el badge.

### Cierre confirmado — 2026-10-08

Alan reportó QA manual **PASS para estados operativos** y autorizó el cierre
EN_QA → COMPLETADA. La confirmación del owner se registra separada de los tests;
no atribuye resultados manuales individuales a las combinaciones sin fixtures.
Se conservan los enums/contratos Backend y datos persistidos reales. Sin
commit/push/merge; este cierre no cambia código ni repite suites.

## Evidencia técnica final

- `npm run test -- src/modules/reservations src/modules/rooms
  'src/app/(private)/staff-property-workspace.test.tsx' --maxWorkers=2`:
  **380 PASS / 61 archivos**. Incluye la matriz pura de 22 combinaciones más
  inmutabilidad, los siete badges/filtros, preservación del DTO/status real y
  header vacío, búsqueda/fechas y recorrido BFF de asignación parcial → completa
  con refresco de detalle/Habitaciones sin modificar estados Backend.
- `npm run test -- --maxWorkers=2`: **1752 PASS / 290 archivos**.
- `npm run typecheck`, `npm run lint`,
  `NEXT_PUBLIC_USE_MOCK_API=false npm run build`, `git diff --check`: **PASS**.
- Backend/DTO/BFF/OpenAPI/enums/persistencia no modificados por esta corrección;
  se conservan los cambios previos sin commit de asignación real. No se repiten
  ni se atribuyen nuevas pruebas Backend a este incremento exclusivamente Web.
  next-env generado por build restaurado a su contenido previo.
- Estado al entregar esta evidencia técnica: EN_QA, con QA manual pendiente en
  ese momento. Estado vigente: **COMPLETADA**, tras la confirmación de Alan
  registrada arriba. No commit/push/merge; nuevas acciones requieren autorización.
