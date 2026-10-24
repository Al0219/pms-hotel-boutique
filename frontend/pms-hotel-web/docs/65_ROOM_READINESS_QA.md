# Limpieza en Habitaciones y preparación para entrega

Incremento posterior EN_QA: contrato Backend53 conecta el checkout interno
con DIRTY y motivo visible por las lecturas actuales. No agrega botón ni endpoint
de checkout; su prueba de la transición es PostgreSQL/servicio real. El cierre
manual del incremento52 descrito debajo permanece histórico y no cubre53.
Backend verify905 PASS/BUILD SUCCESS, incluidos16 casos nuevos; hubo un timeout
Swagger20s en la primera suite y la repetición íntegra pasó sin cambiar pruebas
ni límites. No se ha desplegado este servicio en3001 ni añadido HTTP/BFF/UI.
El QA visual histórico no se atribuye al nuevo checkout; contrato y QA manual
del siguiente flujo Staff por acordar con José.

Estado: COMPLETADA; validación técnica y QA manual propio de José PASS,
confirmado expresamente por el usuario para este incremento.
Owner José frontend/backend. Decisión aprobada 2026-10-21,
[contrato52](../../../backend/docs/52_ROOM_READINESS_CONTRACT.md). No cambia estados
de tareas históricas ni atribuye el QA manual de Housekeeping a este incremento.

## Recorrido

- Recepción, PROPERTY concreta, `/staff/habitaciones`: columna/filtro Limpieza
  actual; Sucia, Limpia pendiente de inspección, Inspeccionada y Sin seguimiento.
  Ocupación por fecha y estado operativo siguen separados. No botones de limpieza.
- Refetch manual, al volver al foco y cada30s con pestaña visible. Mientras carga,
  ante error o ante scope distinto, no se muestra una inspección anterior como
  vigente. Sin seguimiento no significa limpia ni ausencia de datos por error.
- Detalle Reserva → Asignar habitación: limpieza actual y advertencia en candidata
  no inspeccionada. Puede preasignarse para una estadía futura sin cambiar su
  estado RESERVED, tarifa, ATS o limpieza. Asignar hoy tampoco hace check-in.
- La entrega está protegida en el servicio checkIn existente: Room asignada e
  INSPECTED actual, con lock/relectura. No existe todavía acción HTTP/UI de check-in;
  no presentar esta entrega como un flujo visual de check-in ya implementado.
- Recepción GET200; tracking/status/DND403, sin eventos ni cambios. Menú/página HK
  conserva OPERATIONS_MANAGE. No permiso global nuevo ni acceso Guest.

## Recorrido de QA manual

José confirmó su QA manual PASS y autorizó commit/push en la misma rama.
La confirmación corresponde a este incremento; no se atribuyen resultados
individuales no reportados a cada escenario de la lista siguiente.

1. En3001, ingresar como Recepción y consultar Habitaciones; ver limpieza y
   filtrar Sucia/Sin seguimiento/Inspeccionada; Limpiar filtros restaura listado.
2. Con otra sesión autorizada de Operaciones/Admin, cambiar limpieza en HK.
   Refrescar Habitaciones y contrastar el mismo roomId; no cambia ocupación/ATS.
3. En reserva futura sin Room, ver aviso de limpieza y preasignar; permanece
   RESERVED, sin inicio de estadía. No afirmar que inspección actual garantiza
   preparación futura. Si no hay fixture aplicable, reportar no ejecutable.
4. Recepción no puede efectuar POST/PUT HK ni entrar al módulo de gestión.
   Validar errores de conexión sin un badge verde anterior; logout limpia caché.

Check-in interno/no Room/DIRTY/CLEAN/untracked, INSPECTED y carrera con cambio
de limpieza se verifican con pruebas PostgreSQL, no con un botón inexistente.
No modificar datos financieros/auditoría para preparar o limpiar el QA.

## Evidencia local — 2026-10-21

- Web:28 archivos/143 casos,135 PASS y8 timeouts con el límite original5s.
  Control del componente HEAD, sin este cambio: mismo timeout de paginación
  (11,35s). Repetición íntegra de los6 archivos afectados:30 PASS con30s por caso
  solo en el runner temporal. Los143 casos quedan verificados entre ambas
  ejecuciones; no se atribuye PASS a una única suite con el límite original.
  Tests, assertions, timeout del repositorio y CI se conservan. Build producción,
  typecheck y lint PASS, con mocks=false.
- Chrome real en3001:22 comprobaciones PASS, cero excepciones JS/5xx, tablero
  móvil390px sin overflow. Recepción lee limpieza y filtra, sin menú de gestión;
  POST tracking/PUT status/PUT dnd403. Admin consulta inspección persistida y guarda
  DND on/off. ATS intacto; reserva/asignación anteriores reutilizadas, sin nueva
  creación. La preasignación DIRTY y el check-in interno se cubren en PostgreSQL
  y UI automatizada; no se presenta un endpoint/botón check-in inexistente.
- Conservación:2 Properties,24 Rooms,6 RoomTypes,2 Reservations,2 Stays,
  1 GuestAccount,2 StaffUsers,28 migraciones y2 filas HK, iguales antes/después.
  Un único recibo de QA; auditoría HK pasa de10 a12 por los2 cambios DND esperados.
  No se borra historia ni se restaura la base desde una copia anterior.
- Docker: Backend/Web saludables en3001; PostgreSQL original conservado.
  La instalación normal npm ci falló por red ETIMEDOUT. Para el QA local se usó
  un override temporal fuera del repo con la imagen de dependencias ya validada,
  comparando byte a byte package.json y package-lock.json antes de compilar.
  Ambas comparaciones y build PASS. Dockerfiles/Compose/lockfile/secrets intactos;
  una reconstrucción desde cero sigue dependiendo de la conectividad al registro.
- Backend: primera suite887 casos con3 fallos de aislamiento de la nueva fixture;
  corregida su limpieza sin modificar los tests de reservas ni borrar auditoría.
  Segunda:796 PASS,0 failures/errors, interrumpida con exit137 durante builds;
  no BUILD SUCCESS. Incluye6 casos de readiness y7 de booking correctos.
  Verificación completa final secuencial: ./mvnw -B verify887 PASS,
  0 failures/errors/skipped, BUILD SUCCESS/JAR,12:24 min con Java21/PostgreSQL17.
  Sin builds ni Chrome simultáneos; informes finales separados. QA manual propio
  de José confirmado PASS. No se atribuye ejecución CI remota.

Artefactos en backend/target/readiness-* ignorado y temporal
pms-room-readiness-qa. No logs, capturas, override ni cachés nuevos versionados.
