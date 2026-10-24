# Alta real de reservas desde Staff

Estado: EN_QA; QA manual de José PASS, gate general/CI pendiente. Owner José; ampliación autorizada
de Web53, centro/detalle IMP-WEB-0301/0302, sin crear ID ni editar XLSX.
Backend [contrato55](../../../backend/docs/55_STAFF_RESERVATION_CREATE_CONTRACT.md)
APPROVED al aceptar José el flujo y autorizar continuar. Rama
feature/staff-reservations-real desde main53b3e09. El cierre de Housekeeping de
la rama documental anterior sigue preservado aparte; no se mezcla en este diff.

## Comportamiento

- Recepción/Gerencia/Super Admin con RESERVATION_MANAGE y una PROPERTY activa
  autorizada: Centro → Nueva reserva. ALL_PROPERTIES exige elegir un hotel.
- Formulario de fechas locales desde hoy, N habitaciones del mismo tipo,
  nombre/apellidos, email, teléfono y notas hasta300. No crea cuenta ni ocupantes.
  RoomType actual no ofrece capacidad: no mostrar un límite ficticio del mock.
- Opciones actuales desde Backend: moneda GTQ y política vigente del catálogo
  público, unidades ATS y total exacto en centavos. No modificar precio desde UI,
  inventar impuestos ni deducir limpieza física de la disponibilidad del tipo.
- Revisión confirma que el alta registra alojamiento pendiente. POST persistido
  crea Reservation CONFIRMED, N stays RESERVED sin Room, folio/cargo inicial,
  auditoría Staff y recibo local. No PAYMENT ni check-in automático.
- Éxito solo ante recibo válido de la property. Enlace a detalle persistido para
  referencia/estado vigente y asignación50; entrada/salida54 sin cambios.
- El detalle conserva el contrato49: aún no expone contacto, notas ni importes
  financieros. El alta los persiste donde corresponde; no se rellenan esas
  lecturas con datos de escenario ni se amplía el módulo financiero en esta tarea.
- Doble clic bloqueado. Tras transporte/5xx/DTO no verificable, conservar cuerpo y
  clave originales; bloquear edición y ofrecer reintentar exactamente la reserva,
  incluso si después ya no hay disponibilidad. No tratar timeout como rechazo.
  La recuperación en memoria dura mientras el formulario siga montado: si se
  cierra/cambia sesión o property, revisar el listado antes de crear otro intento.
- Respuesta de otra sesión/property no publica éxito. Sin PII/clave en storage ni
  tokens en JavaScript. BFF valida Origin, JSON cerrado, credenciales Staff,
  allowlist de errores y DTO; respuestas private,no-store.
- Invalidación acotada a lista/detalle/stays y disponibilidad de la property;
  no modificar asignaciones, limpieza ni datos ajenos optimistamente.

## Recorrido de QA manual

1. Ingresar como Recepción autorizada, elegir hotel y abrir Nueva reserva desde
   Centro; también debe aparecer si el listado está vacío. Sin permiso no aparece.
2. Introducir llegada de hoy, salida posterior y datos de prueba autorizados.
   Campos inválidos muestran error y foco; editar conserva lo introducido.
3. Consultar y seleccionar tipo/tarifa. Ver total GTQ por noches y habitaciones;
   no opciones → modificar fechas. No confundir ATS con habitación inspeccionada.
4. Crear y abrir detalle: código persistido, CONFIRMED y N stays RESERVED sin
   asignación. Recargar y contrastar el listado; sin duplicar por doble clic.
5. Intentar asignar una candidata DIRTY: deshabilitada/motivo rojo y rechazo
   Backend. Asignar Room INSPECTED de tipo/propiedad correctos y hacer check-in
   de una stay de hoy; las demás permanecen intactas.
6. Intentar checkout sin pagar: OUTSTANDING_BALANCE, estancia aún IN_HOUSE y
   limpieza sin cambios. No marcar la reserva pagada para hacer pasar este caso.
7. Cambiar tarifa/agotamiento después de consultar: conflicto sin éxito ni
   escrituras parciales. Corte de respuesta: reintento recupera la misma reserva.
8. Cambiar property/sesión, logout, escritorio/móvil, teclado y campos largos.
   No datos de otra property, scroll horizontal ni éxito publicado tras abandonar.

## Validación técnica

- Java21/PostgreSQL17 aislados: verify general1031, un timeout HTTP de Swagger;
  repetición95 PASS (13 alta Staff,62 HTTP público,20 OpenAPI). No declarar que
  la corrida general terminó BUILD SUCCESS: el caso HTTP sí pasó al repetirlo.
- Node24: lint, typecheck y build de producción PASS. Las seis suites afectadas
  tuvieron64/64 PASS; última repetición final63/64 por timeout5s del caso mock
  «preserves inputs when editing, creates N stays…». Los casos reales nuevos,
  mappers, BFF, permisos y Centro vacío pasan. Sin cambiar límites/assertions.
- General Web anterior a corregir el Centro:2328/2374,46 fallos; tres eran del
  CTA vacío/header reintroducido y quedaron corregidos conservando su diseño.
  Repetición de13 archivos:293/295; los dos casos restantes de administración
  (`recovers from an expired second-page cursor…` y `edits real email with
  mocks=false…`) también fallan en una copia exacta de origin/main53b3e09.
  Esa comparación no demuestra que el timeout mock restante esté reproducido en
  main. El gate general/CI sigue pendiente; no se tocaron otros módulos.
- Chrome contra BFF/Backend/PostgreSQL reales:25 comprobaciones PASS, incluidos
  corte tras commit/replay de idéntica clave/cuerpo, dos roles, N stays, rechazo
  DIRTY, inspección/asignación, check-in por UI, checkout409 por deuda, móvil390px
  y logout al Inicio. Sin excepciones JavaScript ni respuestas5xx. SQL verifica
  un folio, un CHARGE, cero PAYMENT y un recibo de creación por reserva.
- QA Docker aislado retirado. Un build agotó memoria al coexistir con ese stack;
  build final PASS tras retirarlo, sin cambiar configuración del proyecto.
- Entorno habitual actualizado en http://localhost:3001; tres servicios healthy
  y8 checks de lectura PASS (Inicio, catálogo público, login, nueva cotización,
  ruta de alta, reservas, rooms y logout de la sesión de QA). Sin crear reservas
  ni cargos en esa BD; se conservan2 properties,24 rooms,5 reservations,5 stays,
  7 estados HK y28 migraciones. Imágenes anteriores guardadas para reversión.

José confirma QA manual PASS («todo funciona», 2026-10-23) y autoriza commit y
push. Gate general/CI pendiente; sin merge ni cierre COMPLETADA.
Evidencia temporal en `pms-staff-creation-qa` fuera del repositorio; no versionar
logs, scripts auxiliares, JAR, capturas ni credenciales. Los mocks históricos
permanecen separados; el recorrido real no los usa para crear reservas.
