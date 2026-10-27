# Reserva Staff: recorrido integrado de recepción y pagos

Estado: **COMPLETADA** para el recorrido documentado. Validación técnica integrada
PASS y aceptación manual confirmada por José el2026-10-27 («todo ese flujo ya quedó»).
Rama `test/staff-reservation-flow-qa`, base
origin/main81accce, posterior al PR174 del dashboard. José autorizó este QA.
No se declara completado el alcance financiero avanzado ni se modifica XLSX.

El cierre aplica a una reserva Staff, una propiedad, una stay y GTQ. Los checks
del PR del código financiero fueron reportados aprobados previamente por José;
esta entrega documental no atribuye una nueva corrida CI/Maven ni ejecución
manual individual de todos los escenarios adversos a su confirmación.
José autoriza commit y push de este cierre documental el2026-10-27; sin merge.

## Alcance y fuentes

Validar las implementaciones existentes, sin agregar reglas ni APIs:

- [Alta Staff55](../../../backend/docs/55_STAFF_RESERVATION_CREATE_CONTRACT.md).
- [Asignación50](../../../backend/docs/50_STAFF_INITIAL_ROOM_ASSIGNMENT_CONTRACT.md)
  y [preparación52](../../../backend/docs/52_ROOM_READINESS_CONTRACT.md).
- [Entrada/salida54](../../../backend/docs/54_STAFF_STAY_LIFECYCLE_CONTRACT.md).
- [Folio y pagos61](../../../backend/docs/61_STAFF_FOLIO_PAYMENT_MVP_CONTRACT.md).
- [Housekeeping51](../../../backend/docs/51_STAFF_HOUSEKEEPING_CONTRACT.md).

Owner José; coordinación de Reservas/Folio y seguridad existente conservada.
Usar Recepción con RESERVATION_MANAGE y FOLIO_PAYMENT_OPERATE; limpieza e
inspección con Super Admin y OPERATIONS_MANAGE. Sesiones aisladas, sin cambiar
roles/permisos, cookies del BFF ni contratos. PROPERTY concreta resuelta desde
la sesión, sin escrituras bajo ALL_PROPERTIES. GuestAccount sigue separado de
GuestProfile; cada operación de entrada/salida actúa sobre ReservationStay.

## Entorno y datos utilizados

Frontend/Backend/PostgreSQL reales del Compose habitual en
`http://localhost:3001`, sin MSW ni respuestas de negocio interceptadas para
simular éxito. No se reconstruyeron servicios ni modificaron configuración,
secretos, dependencias, migraciones, código de producto o datos históricos.

Se creó una sola reserva QA identificada con nombre/notas/correo de prueba:

| Dato | Resultado |
| --- | --- |
| Referencia | `KYEMCQY6HB` |
| Detalle | `/reservas/5c1bd88f-e399-4b49-a77e-6dc815cc390d` |
| Estadía | 27 → 28 octubre 2026, una habitación Classic |
| Habitación física | 201; libre antes de seleccionarla |
| Cargo inicial | GTQ650.00, un CHARGE |
| Abono y liquidación restante | GTQ325.00 + GTQ325.00, dos PAYMENT negativos |
| Saldo final / folio | GTQ0.00 / OPEN |
| Reserva padre / estancia | CONFIRMED / CHECKED_OUT |
| Limpieza final | INSPECTED, DND=false conservado |

El registro QA y su historial se conservan: no se borran reservas, pagos ni
auditoría para limpiar una prueba. La salida fue anticipada con confirmación;
se conservaron fechas y cargo originales. Los pagos acreditan dinero recibido
en el escenario académico; no se ejecutó cobro bancario ni PSP.

## Evidencia técnica

PASS: **46 comprobaciones funcionales distintas de navegador/HTTP y14 SQL**,
con Recepción y Super Admin en contextos de navegador independientes:

- Doble clic de creación: un POST, una reserva CONFIRMED, una stay RESERVED
  sin Room y un cargo sin pago automático. ATS4 → 3 para el tipo/fechas elegidos.
- DIRTY visible/deshabilitada con motivo; PUT rechazado también en Backend,
  sin asignación parcial. Recepción puede consultar limpieza pero su PUT recibe403.
- CLEAN admite preasignación; check-in rechazado por inspección pendiente.
  INSPECTED permite entrada y la stay pasa a IN_HOUSE.
- Checkout sin pagar y después del abono rechazados por saldo pendiente:
  conservan estancia/limpieza/cargos. No hay recibo de salida exitoso por rechazo.
- Abono confirmado en servidor; se interrumpió únicamente su respuesta real201.
  Recarga conserva la referencia pendiente; recuperar repite clave/cuerpo
  idénticos y devuelve el mismo movimiento. No se genera otro pago al recargar.
- Liquidación con «Usar saldo total»: importe exacto restante, dos pagos en
  total, saldo0 y folio OPEN. No cierre, compensación ni cobro PSP implícitos.
- Checkout pagado: CHECKED_OUT y Room DIRTY con motivo automático. ATS3 → 4.
  Habitaciones muestra «Sin estadía» y «Sucia» como conceptos independientes.
- Super Admin ve el motivo en Housekeeping; limpia e inspecciona de nuevo.
  Logout de ambos roles regresa al inicio; lectura financiera posterior401.
- Detalle móvil: clientWidth/scrollWidth/innerWidth390, sin desbordamiento.
  Sin excepciones JS ni respuestas API5xx durante las etapas verificadas.

SQL: un CHARGE+65000, dos PAYMENT-32500, saldo0, tres movimientos atribuidos al
mismo Staff de Recepción; un evento de entrada y otro de salida, sin duplicación
por rechazos/replay. Cinco recibos locales exitosos: creación, entrada, dos
pagos y salida. No GuestAccount creado ni vinculado implícitamente.
La huella de los16 movimientos anteriores coincide exactamente antes/después.
Conteos de negocio10→11 reservas,10→11 stays,8→9 folios,16→19 movimientos;
GuestAccounts1 y migraciones31 sin cambios.

El navegador se ejecutó por etapas sobre los mismos IDs. El primer harness se
detuvo al buscar un botón aún ocupado por la recarga tras un rechazo; se ajustó
la espera. La etapa siguiente esperaba «Libre de estadías» en la fila, cuyo texto
real es «Sin estadía»; se corrigió el selector. No fueron correcciones de producto
ni se repitieron pagos o altas. Los reportes iniciales conservan su FAIL; el
resumen agrupa las comprobaciones funcionales PASS y el cierre de SQL.

Evidencia fuera de Git: `%TEMP%/pms-staff-reservation-flow-qa`, con reportes
originales/continuaciones, state, capturas, consultas SQL de solo lectura y
`summary.json`. No nuevos tests unitarios/build/Maven/CI ejecutados para esta
entrega documental; los checks anteriores no se presentan como una corrida nueva.
No commit/push de este incremento. La aceptación manual posterior del owner
queda registrada al inicio, separada de esta evidencia automatizada.

## Guía de aceptación manual

1. Entrar como Recepción en3001 y abrir Reservas → Nueva reserva. Elegir llegada
   hoy según el hotel, salida posterior, una habitación y datos de huésped.
2. Consultar disponibilidad, elegir tipo/tarifa, revisar y crear. Abrir el detalle:
   debe haber una stay sin asignar y un cargo pendiente; no un pago automático.
3. Abrir Asignar habitación. Una sucia debe mostrar motivo y no poder elegirse.
   Con Super Admin, usar Housekeeping para marcar limpia la habitación elegida.
4. Asignarla desde Recepción. Marcar limpia no autoriza entrada: solo después
   de inspeccionarla con Super Admin debe permitirse «Registrar entrada».
5. Intentar salida con deuda y comprobar el rechazo. En Folio y pagos ingresar
   un abono menor al saldo, revisar y confirmar; debe quedar un único pago.
6. Intentar salida otra vez: todavía bloqueada. Pulsar «Usar saldo total», revisar
   el importe restante y confirmar; saldo0, movimientos sin duplicados.
7. Registrar salida y confirmar. Debe quedar finalizada y la habitación sucia
   con motivo; fechas y cargos conservados, sin cerrar el folio automáticamente.
8. En Habitaciones comprobar «Sin estadía» y «Sucia». Con Super Admin completar
   limpieza e inspección; cerrar sesión y comprobar regreso al inicio público.

Para repetir el ciclo, crear una reserva nueva: la QA de arriba ya terminó.
Alcance comprobado: una propiedad, una stay y GTQ. No constituye QA manual de
multi-room, otra moneda/propiedad, saldo no verificable, concurrencia masiva,
otros módulos ni aceptación de la app Android. El pago público permanece simulado.
