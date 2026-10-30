# Folio mínimo Staff y registro de pagos — contrato del incremento

> Incremento MVP 2026-10-29: [64](64_STAY_JOURNEY_MVP.md) agrega pago simulado separado y documento informativo. Este formulario presencial conserva contrato y comportamiento. Las exclusiones de tarjeta/invoice de esta entrega histórica no describen el incremento nuevo EN_QA.


Estado: CONTRATO CONFIRMADO por José el 2026-10-26: «permitamos abono y pago total».
Solicitud: cerrar el ciclo de reservas tomadas desde recepción; rama
feature/staff-folio-payments desde main566c7f0. Owner de este incremento: José,
autorizado a retomar el trabajo full stack. Coordinación de contratos BD1/BD3.
Implementación de este incremento mínimo: COMPLETADA. José confirma aceptación
manual del recorrido Staff el2026-10-27 («todo ese flujo ya quedó»), después de
los checks del PR previamente reportados aprobados y del QA integrado Web71.
No completa entregas financieras anteriores ni el folio avanzado. Las notas
de EN_QA/pendientes posteriores a este encabezado son evidencia histórica.

## Fuentes y alcance

Reutilizar FolioService, StaffFolioService, FolioTransactionGuard,
LocalOperationService, dinero y auditoría existentes. Permiso vigente
FOLIO_PAYMENT_OPERATE, incluido en RECEPCION; sesión Staff y propiedad explícita.
Documentos20/21/29/54/55. Continuación limitada de BD2-FP-002/003 y de
IMP-WEB-0401/0302; no cierra el folio avanzado ni el ciclo PSP IMP-WEB-0404/0408.
XLSX consultado, sin modificarlo. GuestAccount/GuestProfile y Reservation/Stay
permanecen separados. No crear un motor financiero ni un módulo de Payments paralelo.

UI principal: resumen financiero real dentro del detalle de reserva Staff,
selector de folio, saldo, movimientos y formulario de registro con confirmación.
La proyección financiera real no procede del mapper provisional de reservas.
No usar las rutas Web actuales de payments/folios basadas en mocks para registrar
un pago real. Las operaciones amplias de esas páginas quedan fuera del incremento.

## Decisión de negocio aprobada

Admitir abonos y pago total, importe positivo y no mayor
que el saldo pendiente del folio en ese momento; misma moneda, sin conversión.
El registro acredita un pago recibido por recepción, no ejecuta un débito bancario.
Descripción obligatoria no vacía, máximo255, como exige MovementAmount existente.
No pedir tarjeta, PAN/CVV ni datos de pasarela. El usuario autorizado confirma
el importe y el folio antes de registrar. No generar un pago automático al abrir.

Solo postings en folios GUEST/OPEN ligados a la reserva de la propiedad consultada.
COMPANY/MASTER se identifican y consultan sin asumir direct bill ni responsabilidad
financiera nueva. Estado del folio no cambia automáticamente al registrar un pago.
No reversos, refunds, nuevos cargos, descuentos, cierre/reapertura ni invoices.

El checkout conserva el contrato54: deuda positiva en cualquier folio vinculado
bloquea; créditos de otros folios/monedas no compensan esa deuda. Falta de folio
o saldo no verificable no equivale a cero. No reescribir reservas históricas.

## Transporte confirmado para este incremento

Las tres lecturas se basan en FP-D02/documento20; este MVP requiere reservationId
en el listado y no implementa búsqueda global ni filtros Company/Group.

| Método y ruta Backend | Entrada | Resultado |
| --- | --- | --- |
| GET /api/v1/properties/{propertyId}/folios | reservationId UUID obligatorio; limit/cursor |200 items de cabeceras y nextCursor nullable |
| GET /api/v1/properties/{propertyId}/folios/{folioId} | IDs UUID |200 cabecera y saldo calculado |
| GET /api/v1/properties/{propertyId}/folios/{folioId}/movements | limit/cursor |200 movimientos firmados y nextCursor nullable |
| POST /api/v1/properties/{propertyId}/folios/{folioId}/payments | Idempotency-Key y body indicado abajo |201 recibo inmutable original o replay |

Paginación de lectura:50 por defecto,1–100, orden estable createdAt/id, cursor
opaco validado y ligado al contexto/filtros. Sin consultas globales ni filtrado
posterior en memoria. Validar sesión/permiso/propiedad antes de consultar IDs.
Folio inexistente y folio fuera de esa propiedad producen el mismo404.
Solo PROPERTY; no sumar importes globales bajo ALL_PROPERTIES.

Cabecera: id, propertyId, type, status, reservationId, stayId, groupId,
currency, holderLabel, createdAt, updatedAt. Detalle usa {folio, balance, movementCount}; balance como
{amount: texto decimal, currency: ISO} y movementCount. Cero movimientos se
presenta como información no verificable, nunca como confirmación de pago.
Movimiento: id, folioId, kind, amount
con signo, description, reversesId, createdBy, createdAt. No exponer entidades.
Fechas UTC ISO-8601; dinero exacto sin float, redondeo implícito ni overflow.

Body de registro (JSON cerrado, máximo2048 bytes tanto en BFF como Backend):

```json
{"amount":{"amount":"125.50","currency":"GTQ"},"description":"Pago recibido en recepción"}
```

No actorId, propiedad alternativa, saldo del navegador, fecha contable del cliente
ni campos de proveedor. Claves cerradas y límites HTTP. Recibo: operationId,
propertyId, folioId, movementId, amount positivo y completedAt. Su saldo actual
se vuelve a consultar; no presentarlo como parte inmutable del recibo.

Cache-Control private,no-store. Bearer Staff solo entre BFF y Backend; el browser
usa cookie Staff HttpOnly. BFF /api/staff/folios y rutas de detalle/
movimientos/pagos con propertyId explícito. Misma validación de Origin/JSON y
sanitización que las mutaciones Staff vigentes; no aceptar cookie Guest como Staff.
Swagger debe reflejar este contrato confirmado en el mismo incremento.

## Consistencia, reintentos y auditoría

- LocalOperationService conserva clave8–128 y fingerprint canonicalizado por
  actor/propiedad/operación/clave. Misma clave/cuerpo recupera el recibo original;
  otra carga con la misma clave409. Revalidar autorización incluso en replay.
  Recuperar el original antes de volver a evaluar saldo/estado para no rechazar
  un replay válido después de que el primer pago haya liquidado la deuda.
- Bajo FolioTransactionGuard compartido con checkout: releer folio/saldo actual,
  validar importe, llamar al StaffFolioService protegido y confirmar movimiento,
  recibo y auditoría en la misma transacción. Dos pagos concurrentes no sobrepagan.
- PAYMENT se almacena negativo y reduce deuda; el formulario recibe importe
  positivo. Nunca UPDATE/DELETE de movimientos ni borrar auditoría. Actor de sesión.
- Doble clic bloqueado. Error incierto conserva clave y carga para repetir la
  misma operación; no anunciar fallo bancario ni éxito sin confirmación Backend.
  Se conserva en sessionStorage únicamente clave/carga/folio/propiedad/actor,
  sin credenciales ni tarjeta. Tras recargar se ofrece recuperar el resultado
  repitiendo esa misma operación; no registrar otra hasta resolverla. Se elimina
  al confirmar y se aísla/descarta al cambiar de cuenta o cerrar sesión.
- Después del éxito, invalidar solo el folio y reserva del actor/propiedad actuales.
  Cambio de sesión/propiedad cancela e ignora resultados tardíos.

Errores:400 formato/moneda/importe/clave inválidos;401 sesión Guest/
inválida;403 permiso/scope;404 recurso ajeno/inexistente;409 tipo/estado/saldo
actual o clave reutilizada incompatibles;5xx incierto sin afirmar resultado.
Errores seguros ProblemDetail, sin PII ni detalles internos.

Códigos409 de este incremento: FOLIO_NOT_PAYABLE, FOLIO_NOT_OPEN,
BALANCE_UNVERIFIABLE, PAYMENT_EXCEEDS_BALANCE e IDEMPOTENCY_KEY_REUSED.
La autorización C2 puede devolver401 al perder todas las propiedades activas;
una sesión válida que solicita una propiedad no autorizada devuelve403.

## Aceptación y entrega

Pruebas HTTP/SQL: Staff/Guest/revocación/permisos/property, vacío real, paginación,
dinero exacto, no modificaciones en GET, pago válido/rechazado, replay/concurrencia,
rollback tardío y auditoría; checkout bloqueado con deuda y permitido tras pagar.
Confirmar el doc OpenAPI real y paridad de mappings. Web: DTO/mapper/service/hook/UI,
carga/error/vacío, importe, confirmación, incertidumbre y cambio de contexto.
QA navegador en3001 solo después de validar y desplegar conservando PostgreSQL.

Sin migraciones aplicadas modificadas, secretos, dependencias nuevas, commit/push
ni cambios de módulos de otros compañeros. EN_QA hasta aceptación manual del owner.

## Entorno preparado

Docker3001 actualizado desde main566c7f0: backend y frontend build PASS, tres
servicios healthy y rutas actuales Guest/Housekeeping verificadas por Swagger y
manifiesto. PostgreSQL conserva contenedor/volumen y conteos de negocio:
9 reservas,9 estancias,7 folios,13 movimientos. Migraciones existentes28→31.
HTTP público200 y lecturas privadas401 sin sesión. Esto no acredita todavía
un pago Staff implementado ni su QA.

## QA manual del incremento — aceptado por el owner el2026-10-27

Confirmación de José para el recorrido documentado en Web71. No se atribuye a su
respuesta una ejecución individual de cada escenario adverso o variante siguiente.

1. En http://localhost:3001 acceder como Recepción o Super Admin. Abrir Reservas,
   seleccionar propiedad y una reserva tomada desde Staff que tenga un folio real
   con cargo de alojamiento. Las reservas históricas sin folio no se rellenan.
2. En su detalle, revisar «Folio y pagos»: saldo, moneda, cargo y folio seleccionado.
   Pulsar Actualizar no debe crear movimientos. Un folio vacío debe decir
   «No verificable»; no debe presentarse como pagado.
3. Registrar un abono menor al saldo, revisar importe/concepto en el diálogo y
   confirmar una vez. Comprobar un único PAYMENT negativo y saldo reducido.
   Si la estancia está IN_HOUSE, la salida debe seguir bloqueada por deuda.
4. Pulsar «Usar saldo total», confirmar el restante y verificar saldo0 y ambos
   pagos. El folio permanece abierto; la salida pasa a estar permitida si todos
   los folios tienen saldo verificable sin deuda y se cumplen sus demás reglas.
5. Un importe0, negativo, con decimales excesivos o superior al saldo debe
   rechazarse. Cancelar el diálogo no registra pagos. No hay campos de tarjeta.
6. Interrumpir la respuesta al POST: no afirmar éxito ni rechazo bancario. Recargar
   conserva la operación en esta pestaña; «Recuperar resultado» usa misma clave y
   carga, incluyendo si el pago ya liquidó el saldo. Nunca registrar otro para
   sustituir un resultado desconocido. Al cerrar sesión se elimina la referencia
   local: volver a consultar los movimientos antes de registrar otro pago.
7. Cambiar propiedad/cuenta durante una carga no debe mostrar datos tardíos ni
   reutilizar un formulario del contexto anterior. Guest no accede a estos BFF.

No incluye cobros PSP, cargos nuevos, reembolsos, conciliación bancaria ni las
páginas financieras generales anteriores basadas en mocks.

## Evidencia del incremento — 2026-10-26

QA integrado posterior,2026-10-27: [Web71](../../frontend/pms-hotel-web/docs/71_STAFF_RESERVATION_FLOW_QA.md),
rama test/staff-reservation-flow-qa desde main81accce.46 comprobaciones distintas
de navegador/HTTP y14 SQL PASS sobre una sola reserva real QA. Abono325.00 y
liquidación325.00 frente a cargo650.00: saldo0. El abono sobrevive a respuesta
perdida y recarga, recuperando misma clave/cuerpo/movimiento sin duplicarse.
Checkout rechazado antes de pagar y después del abono; permitido tras liquidar,
con Room DIRTY/motivo y posterior limpieza/inspección. Historial financiero previo
intacto. Validación técnica por etapas; esperas/selectores del harness corregidos,
sin cambios de código ni nuevos pagos/altas para reintentar. No nueva corrida
Maven/CI ni aceptación manual del owner. Se conserva EN_QA.

- Backend: verify focal final111/111 PASS, incluidos17 HTTP financieros, guard/
  idempotencia, reversos internos existentes,40 lifecycle y24 OpenAPI/paridad.
  La corrida completa anterior1127 tuvo1126 PASS y un fallo de metadatos Swagger
  (respuesta genérica en lugar de application/json). Se corrigieron las cuatro
  anotaciones; OpenAPI y regresión financiera revalidados en el verify111 PASS.
  No se atribuye un segundo verify completo sin selección a ese resultado.
- Web: lint, typecheck y build PASS. Suite completa2616:2613 PASS/3 FAIL.
  Los siete archivos afectados/próximos al incremento suman78 PASS, incluidos31
  nuevos casos de folio, mapper, BFF y recuperación, y la composición autorizada.
- Fallos generales no modificados: staff-admin.test.tsx (cursor de segunda página,
  timeout5000ms, también reproducido en archivo intacto de main566c7f0);
  public-real-checkout.test.tsx (carrera de cancelación con respuesta artificial
  de100ms; pasa aislada); real-guest-reservations.test.tsx (espera del enlace de
  historial; ambas variantes pasan aisladas). Comparación descartable de main:
  mismo timeout administrativo, otros tres casos seleccionados PASS. No se
  amplió ningún timeout, excluyó prueba del build ni modificó esos módulos.
  La suite general local no se presenta como PASS; su estabilización sigue pendiente.
- Docker3001: backend/web reconstruidos y los tres servicios healthy. Mismo
  contenedor/volumen PostgreSQL y conteos2 propiedades/24 habitaciones/9 reservas/
  9 estancias/7 folios/13 movimientos/1 GuestAccount/31 migraciones. Sin cambios
  de configuración, secretos, dependencias o migraciones.
- Chrome real:13 comprobaciones PASS con Recepción, saldo y cargos reales,
  validación0, saldo total exacto, confirmación cancelable sin POST automático,
  escritorio/móvil sin desbordamiento, logout y lectura privada401. Sin
  excepciones ni errores500, sin registrar pagos o crear reservas en el sistema.
  Los pagos efectivos/rollback/concurrencia se probaron en PostgreSQL descartable.

Pendiente: QA manual del owner y resolución/validación del CI general; no marcar
COMPLETADA. Logs, imágenes y copias de comparación fuera de Git.

Publicación autorizada por José el2026-10-27: commit/push del incremento, sin
declarar QA manual ni CI general PASS. origin/main51d6e32 añade Room Service;
se asigna61 a este contrato para conservar el60 de ese módulo. La limpieza de
cachés financieros queda separada de la lista compartida, conservando su
comportamiento y permitiendo incorporar las claves de otros módulos sin conflicto.

Publicado el commit funcional ae88d50 en origin/feature/staff-folio-payments.
Combinación simulada con origin/main51d6e32: sin conflictos, conserva Folio y
Room Service; typecheck y lint PASS. Regresión compartida48 PASS en cinco archivos
(worker threads; assertions y timeouts originales). El primer intento con forks
tuvo cuatro timeouts/esperas; no se presenta como PASS. Sin merge/rebase ni
modificaciones a main. QA manual y CI general continúan pendientes.
